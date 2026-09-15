import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { EnbwApiError, fetchStationDetails, fetchStationsAround, haversineMetres } from "./lib/enbw.mjs";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultHtmlRoot = path.join(currentDirectory, "html");
const NETHERLANDS_BOUNDS = Object.freeze({ minLat: 50.70, maxLat: 53.60, minLon: 3.20, maxLon: 7.30 });
const ALLOWED_RADII = new Set([250, 500, 1000, 2000]);
const DEFAULT_HISTORY_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const DEFAULT_MAX_CONCURRENT_SEARCHES = 2;
const DEFAULT_DETAIL_CACHE_TTL_MS = 60000;
const MAX_REMEMBERED_STATIONS = 5000;
const MAX_CACHED_STATION_DETAILS = 100;
const MAX_CONNECTED_OVERVIEW_STATIONS = 40;
const CONNECTED_DETAIL_CONCURRENCY = 3;
const CONNECTED_STATES = new Set(["OCCUPIED", "CHARGING", "SUSPENDED_EV", "SUSPENDED_EVSE"]);
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "connect-src 'self' https://api.pdok.nl https://tile.openstreetmap.org",
  "font-src 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "img-src 'self' https://tile.openstreetmap.org",
  "object-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "upgrade-insecure-requests",
].join("; ");
const MIME_TYPES = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml; charset=utf-8"],
]);

function jsonResponse(response, status, payload, headers = {}) {
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    ...headers,
  });
  response.end(JSON.stringify(payload));
}

function publicError(error) {
  if (error instanceof EnbwApiError) return { status: error.status, message: error.message };
  return { status: 500, message: "Unexpected server error" };
}

class SearchCapacityError extends Error {
  constructor() {
    super("Charger search capacity is temporarily busy; try again shortly");
    this.name = "SearchCapacityError";
  }
}

function positiveInteger(value, fallback) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : fallback;
}

function isWithinNetherlands(lat, lon) {
  return lat >= NETHERLANDS_BOUNDS.minLat && lat <= NETHERLANDS_BOUNDS.maxLat
    && lon >= NETHERLANDS_BOUNDS.minLon && lon <= NETHERLANDS_BOUNDS.maxLon;
}

function cacheKey(lat, lon, radius) {
  return `${lat.toFixed(5)}:${lon.toFixed(5)}:${radius}`;
}

function filterStations(stations, lat, lon, radius) {
  return stations.filter((station) => haversineMetres([lat, lon], station.position) <= radius);
}

async function mapWithConcurrency(values, concurrency, mapper) {
  const results = new Array(values.length);
  let cursor = 0;
  async function worker() {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(values[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, worker));
  return results;
}

function loadStationHistory(historyFile, historyTtlMs) {
  if (!historyFile) return new Map();
  try {
    const cutoff = Date.now() - historyTtlMs;
    const stored = JSON.parse(fs.readFileSync(historyFile, "utf8"));
    if (!Array.isArray(stored)) return new Map();
    return new Map(stored
      .filter((station) => typeof station?.id === "string"
        && Array.isArray(station.position)
        && station.position.length === 2
        && station.position.every(Number.isFinite)
        && Number.isFinite(station.lastSeenAtMs)
        && station.lastSeenAtMs >= cutoff)
      .map((station) => [station.id, station]));
  } catch (error) {
    if (error.code !== "ENOENT") console.warn(`[charge-nearby] Could not load station history: ${error.message}`);
    return new Map();
  }
}

function persistStationHistory(historyFile, stationHistory) {
  if (!historyFile) return;
  try {
    fs.mkdirSync(path.dirname(historyFile), { recursive: true });
    const newest = [...stationHistory.values()]
      .sort((a, b) => b.lastSeenAtMs - a.lastSeenAtMs)
      .slice(0, MAX_REMEMBERED_STATIONS);
    const temporaryFile = `${historyFile}.tmp-${process.pid}`;
    fs.writeFileSync(temporaryFile, JSON.stringify(newest), { mode: 0o600 });
    fs.renameSync(temporaryFile, historyFile);
  } catch (error) {
    console.warn(`[charge-nearby] Could not save station history: ${error.message}`);
  }
}

export function createChargeNearbyServer({
  apiKey = process.env.ENBW_API_KEY,
  fetchImpl = fetch,
  htmlRoot = defaultHtmlRoot,
  cacheTtlMs = Number(process.env.CACHE_TTL_MS) || 60000,
  staleTtlMs = Number(process.env.STALE_TTL_MS) || 900000,
  historyTtlMs = Number(process.env.STATION_HISTORY_TTL_MS) || DEFAULT_HISTORY_TTL_MS,
  historyFile = process.env.STATION_HISTORY_FILE || null,
  maxConcurrentSearches = process.env.MAX_CONCURRENT_SEARCHES,
  detailCacheTtlMs = Number(process.env.DETAIL_CACHE_TTL_MS) || DEFAULT_DETAIL_CACHE_TTL_MS,
} = {}) {
  const cache = new Map();
  const inFlight = new Map();
  const concurrentSearchLimit = positiveInteger(maxConcurrentSearches, DEFAULT_MAX_CONCURRENT_SEARCHES);
  const stationHistory = loadStationHistory(historyFile, historyTtlMs);
  const stationDetailCache = new Map();
  const stationDetailRequests = new Map();

  function mergeWithStationHistory(liveStations, lat, lon, radius, generatedAtMs) {
    const cutoff = generatedAtMs - historyTtlMs;
    for (const [id, station] of stationHistory) {
      if (station.lastSeenAtMs < cutoff) stationHistory.delete(id);
    }

    const lastSeenAt = new Date(generatedAtMs).toISOString();
    const currentStations = liveStations.map((station) => {
      const current = { ...station, current: true, lastSeenAt };
      stationHistory.set(station.id, { ...current, lastSeenAtMs: generatedAtMs });
      return current;
    });
    const currentIds = new Set(currentStations.map((station) => station.id));
    const oldest = [...stationHistory.values()]
      .sort((a, b) => b.lastSeenAtMs - a.lastSeenAtMs)
      .slice(MAX_REMEMBERED_STATIONS);
    oldest.forEach((station) => stationHistory.delete(station.id));
    const unavailableStations = filterStations([...stationHistory.values()], lat, lon, radius)
      .filter((station) => !currentIds.has(station.id))
      .map(({ lastSeenAtMs, ...station }) => ({
        ...station,
        current: false,
        known: false,
        available: 0,
        unknown: station.total,
      }));

    persistStationHistory(historyFile, stationHistory);
    return [...currentStations, ...unavailableStations];
  }

  function findCached(lat, lon, radius, maxAge) {
    const centrePrefix = `${lat.toFixed(5)}:${lon.toFixed(5)}:`;
    return [...cache.entries()]
      .filter(([key, entry]) => key.startsWith(centrePrefix)
        && entry.radius >= radius
        && Date.now() - entry.generatedAtMs <= maxAge)
      .sort(([, a], [, b]) => a.radius - b.radius)[0]?.[1] || null;
  }

  async function loadStations(lat, lon, radius) {
    const fresh = findCached(lat, lon, radius, cacheTtlMs);
    if (fresh) {
      return { ...fresh, stations: filterStations(fresh.stations, lat, lon, radius), cache: "hit" };
    }

    const key = cacheKey(lat, lon, radius);
    if (inFlight.has(key)) return inFlight.get(key);
    if (inFlight.size >= concurrentSearchLimit) throw new SearchCapacityError();
    const request = (async () => {
      try {
        const result = await fetchStationsAround({ lat, lon, radiusM: radius, apiKey, fetchImpl });
        const generatedAtMs = Date.now();
        const entry = {
          source: "EnBW mobility+",
          generatedAt: new Date(generatedAtMs).toISOString(),
          generatedAtMs,
          radius,
          requestCount: result.requestCount,
          stations: mergeWithStationHistory(result.stations, lat, lon, radius, generatedAtMs),
        };
        cache.set(key, entry);
        if (cache.size > 50) cache.delete(cache.keys().next().value);
        return { ...entry, cache: "miss" };
      } catch (error) {
        const stale = findCached(lat, lon, radius, staleTtlMs);
        if (stale) {
          return { ...stale, stations: filterStations(stale.stations, lat, lon, radius), cache: "stale" };
        }
        throw error;
      } finally {
        inFlight.delete(key);
      }
    })();
    inFlight.set(key, request);
    return request;
  }

  async function loadStationDetails(stationId) {
    const cached = stationDetailCache.get(stationId);
    if (cached && Date.now() - cached.generatedAtMs <= detailCacheTtlMs) {
      return { ...cached, cache: "hit" };
    }
    if (stationDetailRequests.has(stationId)) return stationDetailRequests.get(stationId);

    const request = (async () => {
      try {
        const numericStationId = stationId.replace(/^enbw-/, "");
        const result = await fetchStationDetails({ stationId: numericStationId, apiKey, fetchImpl });
        const generatedAtMs = Date.now();
        const entry = {
          ...result,
          generatedAt: new Date(generatedAtMs).toISOString(),
          generatedAtMs,
        };
        stationDetailCache.set(stationId, entry);
        if (stationDetailCache.size > MAX_CACHED_STATION_DETAILS) {
          stationDetailCache.delete(stationDetailCache.keys().next().value);
        }
        return { ...entry, cache: "miss" };
      } finally {
        stationDetailRequests.delete(stationId);
      }
    })();
    stationDetailRequests.set(stationId, request);
    return request;
  }

  async function loadConnectedOverview(lat, lon, radius) {
    const searchedArea = findCached(lat, lon, radius, staleTtlMs);
    if (!searchedArea) {
      throw new EnbwApiError("Run the charger search again before loading this overview", { status: 409 });
    }
    const areaStations = filterStations(searchedArea.stations, lat, lon, radius)
      .filter((station) => station.current !== false);
    if (areaStations.length > MAX_CONNECTED_OVERVIEW_STATIONS) {
      throw new EnbwApiError(
        `This circle contains ${areaStations.length} stations; choose a smaller radius to scan at most ${MAX_CONNECTED_OVERVIEW_STATIONS}`,
        { status: 422 },
      );
    }

    let failedStations = 0;
    const detailResults = await mapWithConcurrency(
      areaStations,
      CONNECTED_DETAIL_CONCURRENCY,
      async (station) => {
        try {
          return { station, details: await loadStationDetails(station.id) };
        } catch (error) {
          failedStations += 1;
          console.warn(`[charge-nearby] Skipping connected overview details for ${station.id}: ${error.message}`);
          return null;
        }
      },
    );
    const now = Date.now();
    const connected = detailResults
      .filter(Boolean)
      .flatMap(({ station, details }) => details.chargePoints
        .filter((chargePoint) => CONNECTED_STATES.has(String(chargePoint.status).toUpperCase()))
        .map((chargePoint) => {
          const updatedAtMs = Date.parse(chargePoint.updatedAt);
          if (!Number.isFinite(updatedAtMs)) return null;
          return {
            stationId: station.id,
            address: station.address,
            operator: station.operator,
            position: station.position,
            distance: Math.round(haversineMetres([lat, lon], station.position)),
            chargePointId: chargePoint.id,
            status: chargePoint.status,
            updatedAt: chargePoint.updatedAt,
            connectedForSeconds: Math.max(0, Math.floor((now - updatedAtMs) / 1000)),
            plugs: chargePoint.plugs,
          };
        }))
      .filter(Boolean)
      .sort((a, b) => b.connectedForSeconds - a.connectedForSeconds || a.distance - b.distance);

    return {
      generatedAt: new Date(now).toISOString(),
      stationsScanned: areaStations.length,
      failedStations,
      connected,
    };
  }

  async function handleApi(request, response, url) {
    if (url.pathname === "/api/health") {
      jsonResponse(response, apiKey ? 200 : 503, {
        ok: Boolean(apiKey),
        source: "EnBW mobility+",
        configured: Boolean(apiKey),
        cachedSearches: cache.size,
        rememberedStations: stationHistory.size,
      });
      return;
    }
    if (url.pathname === "/api/charger-details") {
      if (!apiKey) {
        jsonResponse(response, 503, { error: "ENBW_API_KEY is not configured" });
        return;
      }
      if (url.searchParams.get("mode") === "overview") {
        const lat = Number(url.searchParams.get("lat"));
        const lon = Number(url.searchParams.get("lon"));
        const radius = Number(url.searchParams.get("radius"));
        if (![lat, lon, radius].every(Number.isFinite) || !ALLOWED_RADII.has(radius)) {
          jsonResponse(response, 400, { error: "Provide valid lat, lon and radius (250, 500, 1000 or 2000)" });
          return;
        }
        if (!isWithinNetherlands(lat, lon)) {
          jsonResponse(response, 400, { error: "This deployment is limited to the European Netherlands" });
          return;
        }
        try {
          jsonResponse(response, 200, await loadConnectedOverview(lat, lon, radius));
        } catch (error) {
          const { status, message } = publicError(error);
          console.error(`[charge-nearby] Connected overview failed: ${error.message}`);
          jsonResponse(response, status, { error: message });
        }
        return;
      }

      const stationId = String(url.searchParams.get("id") || "");
      if (!/^enbw-\d{1,20}$/.test(stationId)) {
        jsonResponse(response, 400, { error: "Provide a valid station ID" });
        return;
      }
      if (!stationHistory.has(stationId)) {
        jsonResponse(response, 404, { error: "Search for this station before requesting details" });
        return;
      }
      try {
        const result = await loadStationDetails(stationId);
        jsonResponse(response, 200, {
          stationId: result.stationId,
          generatedAt: result.generatedAt,
          cache: result.cache,
          chargePoints: result.chargePoints,
        });
      } catch (error) {
        const { status, message } = publicError(error);
        console.error(`[charge-nearby] EnBW station detail failed for ${stationId}: ${error.message}`);
        jsonResponse(response, status, { error: message });
      }
      return;
    }
    if (url.pathname !== "/api/chargers") {
      jsonResponse(response, 404, { error: "Not found" });
      return;
    }
    if (!apiKey) {
      jsonResponse(response, 503, { error: "ENBW_API_KEY is not configured" });
      return;
    }

    const lat = Number(url.searchParams.get("lat"));
    const lon = Number(url.searchParams.get("lon"));
    const radius = Number(url.searchParams.get("radius"));
    if (![lat, lon, radius].every(Number.isFinite) || !ALLOWED_RADII.has(radius)) {
      jsonResponse(response, 400, { error: "Provide valid lat, lon and radius (250, 500, 1000 or 2000)" });
      return;
    }
    if (!isWithinNetherlands(lat, lon)) {
      jsonResponse(response, 400, { error: "This deployment is limited to the European Netherlands" });
      return;
    }

    try {
      const result = await loadStations(lat, lon, radius);
      jsonResponse(response, 200, {
        generatedAt: result.generatedAt,
        source: result.source,
        cache: result.cache,
        radius,
        stations: result.stations,
      });
    } catch (error) {
      if (error instanceof SearchCapacityError) {
        jsonResponse(response, 503, { error: error.message }, { "Retry-After": "1" });
        return;
      }
      const { status, message } = publicError(error);
      console.error(`[charge-nearby] EnBW search failed: ${error.message}`);
      jsonResponse(response, status, { error: message });
    }
  }

  function serveStatic(request, response, url) {
    let pathname;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      response.writeHead(400).end("Bad request");
      return;
    }
    const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    const filePath = path.resolve(htmlRoot, relativePath);
    const rootPrefix = `${path.resolve(htmlRoot)}${path.sep}`;
    if (!filePath.startsWith(rootPrefix)) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    let stats;
    try {
      stats = fs.statSync(filePath);
    } catch {
      response.writeHead(404).end("Not found");
      return;
    }
    if (!stats.isFile()) {
      response.writeHead(404).end("Not found");
      return;
    }
    const extension = path.extname(filePath).toLowerCase();
    response.writeHead(200, {
      "Cache-Control": extension === ".html" ? "no-cache" : "public, max-age=3600",
      "Content-Security-Policy": CONTENT_SECURITY_POLICY,
      "Content-Length": stats.size,
      "Content-Type": MIME_TYPES.get(extension) || "application/octet-stream",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
    });
    if (request.method === "HEAD") response.end();
    else fs.createReadStream(filePath).pipe(response);
  }

  return http.createServer(async (request, response) => {
    if (!request.url) {
      response.writeHead(400).end("Bad request");
      return;
    }
    const url = new URL(request.url, "http://localhost");
    const isApiRequest = url.pathname.startsWith("/api/");
    const allowedMethods = isApiRequest ? ["GET"] : ["GET", "HEAD"];
    if (!allowedMethods.includes(request.method || "")) {
      response.writeHead(405, { Allow: allowedMethods.join(", ") }).end("Method not allowed");
      return;
    }
    if (isApiRequest) await handleApi(request, response, url);
    else serveStatic(request, response, url);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 8080;
  const host = process.env.HOST || "127.0.0.1";
  const server = createChargeNearbyServer();
  server.listen(port, host, () => {
    console.log(`Charge Nearby is running at http://${host}:${port}`);
    if (!process.env.ENBW_API_KEY) console.warn("ENBW_API_KEY is missing; charger searches will be unavailable.");
  });
}
