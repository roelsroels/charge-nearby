const API_BASE = "https://api.emp.emob-enbw.com/emobility-public-api/api/v1";
const EARTH_RADIUS_M = 6371000;
const GROUPING_DIVISOR = 20;

export class EnbwApiError extends Error {
  constructor(message, { status = 502, cause } = {}) {
    super(message, { cause });
    this.name = "EnbwApiError";
    this.status = status;
  }
}

export class EnbwAuthError extends EnbwApiError {
  constructor(message = "The EnBW API key was rejected") {
    super(message, { status: 503 });
    this.name = "EnbwAuthError";
  }
}

export function haversineMetres([lat1, lon1], [lat2, lon2]) {
  const toRadians = (degrees) => degrees * Math.PI / 180;
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLon = toRadians(lon2 - lon1);
  const a = Math.sin(deltaLat / 2) ** 2
    + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(deltaLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

export function boundsForRadius(lat, lon, radiusM) {
  const latDelta = radiusM / 111320;
  const lonScale = Math.max(0.1, Math.cos(lat * Math.PI / 180));
  const lonDelta = radiusM / (111320 * lonScale);
  return {
    fromLat: lat - latDelta,
    toLat: lat + latDelta,
    fromLon: lon - lonDelta,
    toLon: lon + lonDelta,
  };
}

function boundsFromViewport(viewPort) {
  if (!viewPort || typeof viewPort !== "object") return null;
  const fromLat = Number(viewPort.lowerLeftLat);
  const fromLon = Number(viewPort.lowerLeftLon);
  const toLat = Number(viewPort.upperRightLat);
  const toLon = Number(viewPort.upperRightLon);
  if (![fromLat, fromLon, toLat, toLon].every(Number.isFinite)) return null;
  if (fromLat > toLat || fromLon > toLon) return null;
  const padding = 0.000002;
  return {
    fromLat: fromLat - padding,
    toLat: toLat + padding,
    fromLon: fromLon - padding,
    toLon: toLon + padding,
  };
}

function boundsKey(bounds) {
  return [bounds.fromLat, bounds.toLat, bounds.fromLon, bounds.toLon]
    .map((value) => Number(value).toFixed(8))
    .join(":");
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

async function requestBounds(bounds, { apiKey, fetchImpl, timeoutMs }) {
  const url = new URL(`${API_BASE}/chargestations`);
  Object.entries(bounds).forEach(([name, value]) => url.searchParams.set(name, String(value)));
  url.searchParams.set("grouping", "false");
  url.searchParams.set("groupingDivisor", String(GROUPING_DIVISOR));

  let response;
  try {
    response = await fetchImpl(url, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en",
        Origin: "https://www.enbw.com",
        Referer: "https://www.enbw.com/",
        "Ocp-Apim-Subscription-Key": apiKey,
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    throw new EnbwApiError("Could not reach the EnBW charging service", { cause: error });
  }

  if (response.status === 401 || response.status === 403) throw new EnbwAuthError();
  if (!response.ok) throw new EnbwApiError(`EnBW returned HTTP ${response.status}`);

  let data;
  try {
    data = await response.json();
  } catch (error) {
    throw new EnbwApiError("EnBW returned invalid JSON", { cause: error });
  }
  if (!Array.isArray(data)) throw new EnbwApiError("EnBW returned an unexpected response");
  return data.filter((item) => item && typeof item === "object");
}

function normaliseStation(station) {
  const lat = Number(station.lat);
  const lon = Number(station.lon);
  const total = Math.max(0, Number(station.numberOfChargePoints) || 0);
  const available = Math.min(total, Math.max(0, Number(station.availableChargePoints) || 0));
  const unknown = Math.min(total, Math.max(0, Number(station.unknownStateChargePoints) || 0));
  const plugTypes = Array.isArray(station.plugTypes) ? station.plugTypes.map(String) : [];
  const plugNames = Array.isArray(station.plugTypeNames) ? station.plugTypeNames.map(String) : [];
  return {
    id: `enbw-${station.stationId}`,
    position: [lat, lon],
    address: String(station.shortAddress || "Public charging location").trim(),
    operator: station.operator ? String(station.operator).trim() : null,
    connectors: plugTypes,
    connectorNames: plugNames,
    available,
    total,
    known: total > 0 && unknown < total,
    unknown,
    powerKw: Math.max(0, Number(station.maxPowerInKw) || 0),
    alwaysOpen: station.alwaysOpen ?? null,
    payment: station.payment ?? null,
    accessible: station.handicappedAccessible ?? null,
  };
}

export async function fetchStationsAround({
  lat,
  lon,
  radiusM,
  apiKey,
  fetchImpl = fetch,
  concurrency = 6,
  maxRequests = 300,
  maxDepth = 8,
  timeoutMs = 15000,
}) {
  if (!apiKey) throw new EnbwAuthError("ENBW_API_KEY is not configured");
  if (![lat, lon, radiusM].every(Number.isFinite)) throw new EnbwApiError("Invalid search coordinates", { status: 400 });

  const stationMap = new Map();
  const seenBounds = new Set();
  let tasks = [boundsForRadius(lat, lon, radiusM)];
  let requestCount = 0;
  let representedChargePoints = 0;
  let reusedClusterReferences = 0;

  for (let depth = 0; tasks.length; depth += 1) {
    if (depth > maxDepth) throw new EnbwApiError("EnBW returned clusters that could not be resolved");
    if (requestCount + tasks.length > maxRequests) {
      throw new EnbwApiError("This area contains too many grouped stations; try a smaller radius", { status: 422 });
    }

    tasks.forEach((bounds) => seenBounds.add(boundsKey(bounds)));
    requestCount += tasks.length;
    const responses = await mapWithConcurrency(tasks, concurrency, (bounds) => requestBounds(bounds, {
      apiKey,
      fetchImpl,
      timeoutMs,
    }));
    if (depth === 0) {
      representedChargePoints = responses.flat().reduce(
        (sum, item) => sum + Math.max(0, Number(item.numberOfChargePoints) || 0),
        0,
      );
    }

    const nextTasks = [];
    const scheduled = new Set();
    for (const items of responses) {
      for (const item of items) {
        const stationId = item.stationId;
        const itemLat = Number(item.lat);
        const itemLon = Number(item.lon);
        if (stationId != null && Number.isFinite(itemLat) && Number.isFinite(itemLon)) {
          stationMap.set(String(stationId), item);
          continue;
        }
        if (!item.grouped) continue;
        const childBounds = boundsFromViewport(item.viewPort);
        if (!childBounds) throw new EnbwApiError("EnBW returned a cluster without valid bounds");
        const key = boundsKey(childBounds);
        if (seenBounds.has(key)) {
          reusedClusterReferences += 1;
        } else if (!scheduled.has(key)) {
          scheduled.add(key);
          nextTasks.push(childBounds);
        }
      }
    }
    tasks = nextTasks;
  }

  const stations = [...stationMap.values()]
    .map(normaliseStation)
    .map((station) => ({
      ...station,
      distance: haversineMetres([lat, lon], station.position),
    }))
    .filter((station) => station.distance <= radiusM)
    .sort((a, b) => a.distance - b.distance || b.available - a.available)
    .map(({ distance, ...station }) => station);

  const resolvedChargePoints = [...stationMap.values()].reduce(
    (sum, station) => sum + Math.max(0, Number(station.numberOfChargePoints) || 0),
    0,
  );
  return {
    stations,
    requestCount,
    representedChargePoints,
    resolvedChargePoints,
    reusedClusterReferences,
  };
}
