import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ENDPOINT = "https://dotnl.ndw.nu/api/rest/geojson/dynamic-road-status/charge-point-data/v1/features";
const COVERAGE = Object.freeze({ minLon: 4.68, minLat: 52.24, maxLon: 5.10, maxLat: 52.46 });
const COLUMNS = 7;
const ROWS = 4;
const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function tileBounds(column, row) {
  const width = (COVERAGE.maxLon - COVERAGE.minLon) / COLUMNS;
  const height = (COVERAGE.maxLat - COVERAGE.minLat) / ROWS;
  return {
    minLon: COVERAGE.minLon + column * width,
    minLat: COVERAGE.minLat + row * height,
    maxLon: COVERAGE.minLon + (column + 1) * width,
    maxLat: COVERAGE.minLat + (row + 1) * height
  };
}

async function fetchTile(bounds, attempt = 0) {
  const bbox = [bounds.minLon, bounds.minLat, bounds.maxLon, bounds.maxLat].join(",");
  const response = await fetch(`${ENDPOINT}?bbox=${bbox}`, {
    headers: { Accept: "application/geo+json", "User-Agent": "charge-nearby-snapshot/1.0" }
  });
  if (response.status === 429 && attempt < 4) {
    await pause(2000 * (attempt + 1));
    return fetchTile(bounds, attempt + 1);
  }
  if (!response.ok) throw new Error(`NDW request failed with ${response.status} for ${bbox}`);
  const payload = await response.json();
  if (!Array.isArray(payload.features)) throw new Error(`NDW returned an invalid feature collection for ${bbox}`);
  if (payload.features.length >= 1000) throw new Error(`NDW tile reached the 1000-feature limit for ${bbox}`);
  return payload.features;
}

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function mergeFeatures(features) {
  const groups = new Map();
  for (const feature of features) {
    const coordinates = feature.geometry?.coordinates;
    if (feature.geometry?.type !== "Point" || !Array.isArray(coordinates) || coordinates.length < 2) continue;
    const lon = safeNumber(coordinates[0]);
    const lat = safeNumber(coordinates[1]);
    if (!lon || !lat) continue;
    const properties = feature.properties || {};
    const address = String(properties.address || "Public charging location").trim();
    const key = `${lon.toFixed(5)}:${lat.toFixed(5)}:${address.toLowerCase()}`;
    if (!groups.has(key)) {
      groups.set(key, {
        id: String(feature.id || key),
        position: [lat, lon],
        address,
        operators: new Set(),
        connectors: new Set(),
        available: 0,
        total: 0,
        known: false,
        powerKw: 0,
        lastUpdated: null
      });
    }
    const group = groups.get(key);
    const operator = properties.operator_name || properties.suboperator_name || properties.owner_name;
    if (operator) group.operators.add(String(operator));
    for (const availability of properties.availabilities || []) {
      const available = Number(availability.available);
      const total = Number(availability.total);
      if (Number.isFinite(available) && Number.isFinite(total)) {
        group.available += Math.max(0, available);
        group.total += Math.max(0, total);
        group.known = true;
      }
      if (availability.connector_type) group.connectors.add(String(availability.connector_type));
      group.powerKw = Math.max(group.powerKw, safeNumber(availability.power_max) / 1000);
    }
    const updated = properties.last_updated;
    if (updated && (!group.lastUpdated || new Date(updated) > new Date(group.lastUpdated))) group.lastUpdated = updated;
  }
  return [...groups.values()].map((group) => ({
    id: group.id,
    position: group.position,
    address: group.address,
    operator: [...group.operators].join(" / ") || null,
    connectors: [...group.connectors],
    available: group.available,
    total: group.total,
    known: group.known,
    powerKw: Math.round(group.powerKw * 10) / 10,
    lastUpdated: group.lastUpdated
  })).sort((a, b) => a.position[0] - b.position[0] || a.position[1] - b.position[1]);
}

const allFeatures = [];
for (let row = 0; row < ROWS; row += 1) {
  for (let column = 0; column < COLUMNS; column += 1) {
    allFeatures.push(...await fetchTile(tileBounds(column, row)));
    await pause(250);
  }
}

const uniqueFeatures = [...new Map(allFeatures.map((feature) => [String(feature.id), feature])).values()];
const stations = mergeFeatures(uniqueFeatures);
if (!stations.length) throw new Error("NDW snapshot contained no charging stations");

const output = {
  generatedAt: new Date().toISOString(),
  source: "NDW DOT-NL",
  coverage: COVERAGE,
  stations
};
const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const outputDirectory = path.resolve(currentDirectory, "../html/data");
await fs.mkdir(outputDirectory, { recursive: true });
await fs.writeFile(path.join(outputDirectory, "chargers.json"), `${JSON.stringify(output)}\n`);
console.log(`Wrote ${stations.length} public charging locations from ${uniqueFeatures.length} NDW features.`);
