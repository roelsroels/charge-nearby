import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
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
      rememberedStations: 0,
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

test("charger API rejects HEAD without starting upstream work", async () => {
  let upstreamRequests = 0;
  const fetchImpl = async () => {
    upstreamRequests += 1;
    return new Response(JSON.stringify(stationPayload), { status: 200 });
  };
  await withServer({ apiKey: "test-key", fetchImpl }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/chargers?lat=52.37312&lon=4.89319&radius=500`, {
      method: "HEAD",
    });
    assert.equal(response.status, 405);
    assert.equal(response.headers.get("allow"), "GET");
    assert.equal(upstreamRequests, 0);
  });
});

test("charger search capacity rejects only new uncached work", async () => {
  let releaseSlowSearch;
  let markSlowSearchStarted;
  let upstreamRequests = 0;
  const slowSearchStarted = new Promise((resolve) => {
    markSlowSearchStarted = resolve;
  });
  const slowSearchReleased = new Promise((resolve) => {
    releaseSlowSearch = resolve;
  });
  const fetchImpl = async () => {
    upstreamRequests += 1;
    if (upstreamRequests === 2) {
      markSlowSearchStarted();
      await slowSearchReleased;
    }
    return new Response(JSON.stringify(stationPayload), { status: 200 });
  };

  await withServer({
    apiKey: "test-key",
    fetchImpl,
    cacheTtlMs: 60000,
    maxConcurrentSearches: 1,
  }, async (baseUrl) => {
    const cachedQuery = "/api/chargers?lat=52.37312&lon=4.89319&radius=500";
    const slowQuery = "/api/chargers?lat=52.37412&lon=4.89319&radius=500";
    const otherQuery = "/api/chargers?lat=52.37512&lon=4.89319&radius=500";

    const warmResponse = await fetch(`${baseUrl}${cachedQuery}`);
    assert.equal(warmResponse.status, 200);
    assert.equal((await warmResponse.json()).cache, "miss");

    const slowResponsePromise = fetch(`${baseUrl}${slowQuery}`);
    await slowSearchStarted;
    const deduplicatedResponsePromise = fetch(`${baseUrl}${slowQuery}`);

    const cachedResponse = await fetch(`${baseUrl}${cachedQuery}`);
    assert.equal(cachedResponse.status, 200);
    assert.equal((await cachedResponse.json()).cache, "hit");

    const saturatedResponse = await fetch(`${baseUrl}${otherQuery}`);
    assert.equal(saturatedResponse.status, 503);
    assert.equal(saturatedResponse.headers.get("retry-after"), "1");
    assert.deepEqual(await saturatedResponse.json(), {
      error: "Charger search capacity is temporarily busy; try again shortly",
    });
    assert.equal(upstreamRequests, 2);

    releaseSlowSearch();
    const [slowResponse, deduplicatedResponse] = await Promise.all([
      slowResponsePromise,
      deduplicatedResponsePromise,
    ]);
    assert.equal(slowResponse.status, 200);
    assert.equal(deduplicatedResponse.status, 200);
    assert.equal(upstreamRequests, 2);

    const resumedResponse = await fetch(`${baseUrl}${otherQuery}`);
    assert.equal(resumedResponse.status, 200);
    assert.equal(upstreamRequests, 3);
  });
});

test("charger endpoint validates radius and Netherlands coverage", async () => {
  let upstreamRequests = 0;
  const fetchImpl = async () => {
    upstreamRequests += 1;
    return new Response("[]", { status: 200 });
  };
  await withServer({ apiKey: "test-key", fetchImpl }, async (baseUrl) => {
    const invalidRadius = await fetch(`${baseUrl}/api/chargers?lat=52.36&lon=4.94&radius=750`);
    assert.equal(invalidRadius.status, 400);

    const rotterdam = await fetch(`${baseUrl}/api/chargers?lat=51.92&lon=4.48&radius=500`);
    assert.equal(rotterdam.status, 200);

    const outside = await fetch(`${baseUrl}/api/chargers?lat=48.86&lon=2.35&radius=500`);
    assert.equal(outside.status, 400);
    assert.equal(upstreamRequests, 1);
  });
});

test("previously seen stations remain visible without current EnBW data", async (t) => {
  const historyDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "charge-nearby-history-"));
  const historyFile = path.join(historyDirectory, "stations.json");
  t.after(() => fs.rmSync(historyDirectory, { recursive: true, force: true }));
  const query = "/api/chargers?lat=52.37312&lon=4.89319&radius=500";

  await withServer({
    apiKey: "test-key",
    historyFile,
    fetchImpl: async () => new Response(JSON.stringify(stationPayload), { status: 200 }),
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}${query}`);
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.equal(payload.stations[0].current, true);
    assert.match(payload.stations[0].lastSeenAt, /^\d{4}-\d{2}-\d{2}T/);
  });

  await withServer({
    apiKey: "test-key",
    historyFile,
    fetchImpl: async () => new Response("[]", { status: 200 }),
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}${query}`);
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.equal(payload.stations.length, 1);
    assert.equal(payload.stations[0].id, "enbw-123456");
    assert.equal(payload.stations[0].current, false);
    assert.equal(payload.stations[0].known, false);
    assert.equal(payload.stations[0].available, 0);
    assert.equal("lastSeenAtMs" in payload.stations[0], false);
  });
});

test("server continues to serve the frontend", async () => {
  await withServer({ apiKey: "test-key" }, async (baseUrl) => {
    const response = await fetch(baseUrl);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /text\/html/);
    assert.match(response.headers.get("content-security-policy"), /frame-ancestors 'none'/);
    assert.match(response.headers.get("content-security-policy"), /connect-src 'self' https:\/\/api\.pdok\.nl/);
    assert.equal(response.headers.get("x-frame-options"), "DENY");
    assert.match(await response.text(), /Charge Nearby/);
  });
});
