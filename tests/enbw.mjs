import assert from "node:assert/strict";
import test from "node:test";

import { boundsForRadius, fetchStationsAround, haversineMetres } from "../lib/enbw.mjs";

const centre = [52.36299993891113, 4.942437485316742];

function station(id, overrides = {}) {
  return {
    grouped: false,
    stationId: id,
    shortAddress: `Station ${id}`,
    operator: "Example operator",
    lat: centre[0],
    lon: centre[1],
    numberOfChargePoints: 2,
    availableChargePoints: 1,
    unknownStateChargePoints: 0,
    plugTypes: ["TYPE_2"],
    plugTypeNames: ["Type 2"],
    maxPowerInKw: 11,
    alwaysOpen: true,
    payment: true,
    ...overrides,
  };
}

test("radius bounds account for longitude scale", () => {
  const bounds = boundsForRadius(centre[0], centre[1], 500);
  assert.ok(bounds.toLon - centre[1] > bounds.toLat - centre[0]);
  assert.ok(Math.abs(haversineMetres(centre, [bounds.toLat, centre[1]]) - 500) < 2);
  assert.ok(Math.abs(haversineMetres(centre, [centre[0], bounds.toLon]) - 500) < 2);
});

test("grouped markers are expanded, deduplicated and filtered by exact radius", async () => {
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({ url: String(url), options });
    const isChild = requests.length > 1;
    const repeatedGroup = {
      grouped: true,
      stationId: null,
      lat: centre[0],
      lon: centre[1],
      viewPort: {
        lowerLeftLat: centre[0] - 0.001,
        lowerLeftLon: centre[1] - 0.001,
        upperRightLat: centre[0] + 0.001,
        upperRightLon: centre[1] + 0.001,
      },
    };
    const payload = isChild
      ? [
        station(1),
        station(2, { shortAddress: "Tweede Ceramstraat 27", lat: centre[0] - 0.0001 }),
        station(3, { lat: centre[0] + 0.02 }),
        repeatedGroup,
      ]
      : [
        station(1),
        repeatedGroup,
      ];
    return new Response(JSON.stringify(payload), { status: 200 });
  };

  const result = await fetchStationsAround({
    lat: centre[0],
    lon: centre[1],
    radiusM: 500,
    apiKey: "test-key",
    fetchImpl,
  });

  assert.equal(result.requestCount, 2);
  assert.equal(result.reusedClusterReferences, 1);
  assert.deepEqual(result.stations.map((item) => item.id), ["enbw-1", "enbw-2"]);
  assert.equal(result.stations[1].address, "Tweede Ceramstraat 27");
  assert.deepEqual(result.stations[0].connectors, ["TYPE_2"]);
  assert.equal(requests[0].options.headers.Origin, "https://www.enbw.com");
  assert.equal(requests[0].options.headers.Referer, "https://www.enbw.com/");
  assert.equal(requests[0].options.headers["Ocp-Apim-Subscription-Key"], "test-key");
  assert.match(requests[0].url, /groupingDivisor=20/);
});

test("unknown connector status is represented honestly", async () => {
  const fetchImpl = async () => new Response(JSON.stringify([
    station(4, { availableChargePoints: 0, unknownStateChargePoints: 2 }),
  ]), { status: 200 });
  const result = await fetchStationsAround({
    lat: centre[0],
    lon: centre[1],
    radiusM: 250,
    apiKey: "test-key",
    fetchImpl,
  });
  assert.equal(result.stations[0].known, false);
  assert.equal(result.stations[0].unknown, 2);
});

test("authentication failures become a service error without leaking the key", async () => {
  const fetchImpl = async () => new Response(JSON.stringify({ message: "forbidden" }), { status: 403 });
  await assert.rejects(
    fetchStationsAround({ lat: centre[0], lon: centre[1], radiusM: 250, apiKey: "test-key", fetchImpl }),
    (error) => error.name === "EnbwAuthError" && !error.message.includes("test-key"),
  );
});
