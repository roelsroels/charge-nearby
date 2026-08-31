import assert from "node:assert/strict";
import test from "node:test";

import { createChargeNearbyServer } from "../server.mjs";

const stationPayload = [{
  grouped: false,
  stationId: 123456,
  shortAddress: "Central Amsterdam example, 1012 JS Amsterdam, NL",
  operator: "Example operator",
  lat: 52.37312,
  lon: 4.89319,
  numberOfChargePoints: 2,
  availableChargePoints: 1,
  unknownStateChargePoints: 0,
  plugTypes: ["TYPE_2"],
  plugTypeNames: ["Type 2"],
  maxPowerInKw: 11,
}];

async function withServer(options, callback) {
  const server = createChargeNearbyServer(options);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    await callback(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test("health endpoint reports whether the key is configured", async () => {
  await withServer({ apiKey: "" }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/health`);
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {
      ok: false,
      source: "EnBW mobility+",
      configured: false,
      cachedSearches: 0,
    });
  });
});

test("charger endpoint caches successful EnBW searches", async () => {
  let upstreamRequests = 0;
  const fetchImpl = async () => {
    upstreamRequests += 1;
    return new Response(JSON.stringify(stationPayload), { status: 200 });
  };
  await withServer({ apiKey: "test-key", fetchImpl, cacheTtlMs: 60000 }, async (baseUrl) => {
    const query = "/api/chargers?lat=52.37312&lon=4.89319&radius=500";
    const first = await fetch(`${baseUrl}${query}`);
    const firstPayload = await first.json();
    assert.equal(first.status, 200);
    assert.equal(firstPayload.cache, "miss");
    assert.equal(firstPayload.stations[0].id, "enbw-123456");

    const second = await fetch(`${baseUrl}${query}`);
    const secondPayload = await second.json();
    assert.equal(secondPayload.cache, "hit");
    assert.equal(upstreamRequests, 1);
  });
});

test("charger endpoint validates radius and Amsterdam coverage", async () => {
  await withServer({ apiKey: "test-key" }, async (baseUrl) => {
    const invalidRadius = await fetch(`${baseUrl}/api/chargers?lat=52.36&lon=4.94&radius=750`);
    assert.equal(invalidRadius.status, 400);
    const outside = await fetch(`${baseUrl}/api/chargers?lat=51.92&lon=4.48&radius=500`);
    assert.equal(outside.status, 400);
  });
});

test("server continues to serve the frontend", async () => {
  await withServer({ apiKey: "test-key" }, async (baseUrl) => {
    const response = await fetch(baseUrl);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /text\/html/);
    assert.match(await response.text(), /Charge Nearby/);
  });
});
