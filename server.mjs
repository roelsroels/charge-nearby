import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { EnbwApiError, fetchStationsAround, haversineMetres } from "./lib/enbw.mjs";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultHtmlRoot = path.join(currentDirectory, "html");
const NETHERLANDS_BOUNDS = Object.freeze({ minLat: 50.70, maxLat: 53.60, minLon: 3.20, maxLon: 7.30 });
const ALLOWED_RADII = new Set([250, 500, 1000, 2000]);
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

export function createChargeNearbyServer({
  apiKey = process.env.ENBW_API_KEY,
  fetchImpl = fetch,
  htmlRoot = defaultHtmlRoot,
  cacheTtlMs = Number(process.env.CACHE_TTL_MS) || 60000,
  staleTtlMs = Number(process.env.STALE_TTL_MS) || 900000,
} = {}) {
  const cache = new Map();
  const inFlight = new Map();

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
    const request = (async () => {
      try {
        const result = await fetchStationsAround({ lat, lon, radiusM: radius, apiKey, fetchImpl });
        const entry = {
          source: "EnBW mobility+",
          generatedAt: new Date().toISOString(),
          generatedAtMs: Date.now(),
          radius,
          requestCount: result.requestCount,
          stations: result.stations,
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

  async function handleApi(request, response, url) {
    if (url.pathname === "/api/health") {
      jsonResponse(response, apiKey ? 200 : 503, {
        ok: Boolean(apiKey),
        source: "EnBW mobility+",
        configured: Boolean(apiKey),
        cachedSearches: cache.size,
      });
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
      "Content-Length": stats.size,
      "Content-Type": MIME_TYPES.get(extension) || "application/octet-stream",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Content-Type-Options": "nosniff",
    });
    if (request.method === "HEAD") response.end();
    else fs.createReadStream(filePath).pipe(response);
  }

  return http.createServer(async (request, response) => {
    if (!request.url || !["GET", "HEAD"].includes(request.method || "")) {
      response.writeHead(405, { Allow: "GET, HEAD" }).end("Method not allowed");
      return;
    }
    const url = new URL(request.url, "http://localhost");
    if (url.pathname.startsWith("/api/")) await handleApi(request, response, url);
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
