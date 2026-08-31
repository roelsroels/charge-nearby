import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const html = fs.readFileSync(new URL("../html/index.html", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../html/styles.css", import.meta.url), "utf8");
const js = fs.readFileSync(new URL("../html/app.js", import.meta.url), "utf8");

test("page exposes the charging search", () => {
  assert.match(html, /id="charger-search"/);
  assert.match(html, /autocomplete="postal-code"/);
  assert.match(html, /name="radius" value="250"/);
  assert.match(html, /name="radius" value="2000"/);
  assert.match(html, /name="radius" value="250" checked/);
  assert.doesNotMatch(html, /name="radius" value="500" checked/);
  assert.match(html, /id="radius-summary">250 m</);
  assert.match(html, /app\.js\?v=1\.0\.2/);
  assert.match(html, /styles\.css\?v=1\.0\.0/);
  assert.match(html, /Available charger, <em>closeby<\/em>/);
  assert.doesNotMatch(html, /A free charger/);
  assert.match(html, /Release v1\.0\.3/);
  assert.match(html, /id="station-list"/);
  assert.match(html, /property="og:image" content="og\.png"/);
  assert.equal(fs.existsSync(new URL("../html/og.png", import.meta.url)), true);
  assert.equal(fs.existsSync(new URL("../docs/screenshots/charge-nearby-1012-js-overview.jpg", import.meta.url)), true);
  assert.equal(fs.existsSync(new URL("../docs/screenshots/charge-nearby-1012-js-results.jpg", import.meta.url)), true);
});

test("postcode and private EnBW API paths stay present", () => {
  assert.match(js, /api\.pdok\.nl\/kadaster\/location-api/);
  assert.match(js, /api\/chargers/);
  assert.doesNotMatch(js, /data\/chargers\.json/);
  assert.doesNotMatch(html, /NDW\/DOT-NL/);
  assert.match(html, /EnBW mobility\+/);
});

test("favorites are persistent and visually distinct", () => {
  assert.match(js, /charge-nearby:favorites:v1/);
  assert.match(js, /localStorage\.setItem/);
  assert.match(js, /aria-pressed/);
  assert.match(js, /toggleFavorite/);
  assert.match(js, /sortStationCards/);
  assert.match(js, /Number\(favorites\.has\(b\.id\)\) - Number\(favorites\.has\(a\.id\)\)/);
  assert.match(js, /popup-favorite-button/);
  assert.match(css, /\.station-card\.is-favorite/);
  assert.match(css, /\.charger-pin\.favorite/);
  assert.match(css, /\.popup-favorite-button/);
  assert.match(html, /Favorites appear first/);
});

test("the last successful postcode is restored", () => {
  assert.match(js, /charge-nearby:last-postcode:v1/);
  assert.match(js, /saveLastPostcode\(formatted\)/);
  assert.match(js, /loadLastPostcode\(\)/);
  assert.match(js, /byId\("postcode"\)\.value = savedPostcode/);
});

test("data freshness keeps updating in idle sessions", () => {
  assert.match(js, /ageSeconds < 60/);
  assert.match(js, /minutes === 1 \? "minute" : "minutes"/);
  assert.match(js, /hours === 1 \? "hour" : "hours"/);
  assert.match(js, /days === 1 \? "day" : "days"/);
  assert.match(js, /setInterval\(updateDataFreshnessLabels, 10000\)/);
  assert.match(js, /visibilitychange/);
  assert.match(js, /window\.addEventListener\("focus", updateDataFreshnessLabels\)/);
});

test("responsive and reduced-motion rules are present", () => {
  assert.match(css, /@media \(max-width: 720px\)/);
  assert.match(css, /prefers-reduced-motion/);
  assert.doesNotMatch(css, /\.intro \{[^}]*min-height:\s*430px/);
  assert.match(css, /\.intro h1 \{[^}]*white-space:\s*nowrap/);
  assert.match(css, /\.finder \{[^}]*min-height:\s*540px/);
});
