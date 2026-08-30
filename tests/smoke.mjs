import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const html = fs.readFileSync(new URL("../html/index.html", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../html/styles.css", import.meta.url), "utf8");
const js = fs.readFileSync(new URL("../html/app.js", import.meta.url), "utf8");
const snapshot = JSON.parse(fs.readFileSync(new URL("../html/data/chargers.json", import.meta.url), "utf8"));

test("static page exposes the core charging search", () => {
  assert.match(html, /id="charger-search"/);
  assert.match(html, /autocomplete="postal-code"/);
  assert.match(html, /name="radius" value="250"/);
  assert.match(html, /name="radius" value="2000"/);
  assert.match(html, /id="station-list"/);
  assert.match(html, /property="og:image" content="https:\/\/roelsroels\.github\.io\/charge-nearby\/og\.png"/);
  assert.equal(fs.existsSync(new URL("../html/og.png", import.meta.url)), true);
});

test("live postcode and NDW data paths stay present", () => {
  assert.match(js, /api\.pdok\.nl\/kadaster\/location-api/);
  assert.match(js, /data\/chargers\.json/);
  assert.doesNotMatch(html, /demonstration data/i);
  assert.match(html, /NDW\/DOT-NL/);
  assert.equal(snapshot.source, "NDW DOT-NL");
  assert.ok(snapshot.stations.length > 100);
  assert.ok(snapshot.stations.every((station) => Array.isArray(station.position)));
});

test("responsive and reduced-motion rules are present", () => {
  assert.match(css, /@media \(max-width: 720px\)/);
  assert.match(css, /prefers-reduced-motion/);
});

test("the reported 1095 DE area contains real NDW locations", () => {
  const centre = [52.36299993891113, 4.942437485316742];
  const toRadians = (degrees) => degrees * Math.PI / 180;
  const distance = ([lat, lon]) => {
    const deltaLat = toRadians(lat - centre[0]);
    const deltaLon = toRadians(lon - centre[1]);
    const a = Math.sin(deltaLat / 2) ** 2
      + Math.cos(toRadians(centre[0])) * Math.cos(toRadians(lat)) * Math.sin(deltaLon / 2) ** 2;
    return 2 * 6371000 * Math.asin(Math.sqrt(a));
  };
  const nearby = snapshot.stations.filter((station) => distance(station.position) <= 500);
  assert.ok(nearby.length >= 10);
  assert.ok(nearby.some((station) => /Ceramplein|Gorontalostraat|Soembawastraat/i.test(station.address)));
  assert.ok(nearby.some((station) => station.known && station.total > 0));
});
