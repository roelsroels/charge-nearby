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
  assert.match(html, /id="station-list"/);
  assert.match(html, /property="og:image" content="og\.png"/);
  assert.equal(fs.existsSync(new URL("../html/og.png", import.meta.url)), true);
});

test("postcode and private EnBW API paths stay present", () => {
  assert.match(js, /api\.pdok\.nl\/kadaster\/location-api/);
  assert.match(js, /api\/chargers/);
  assert.doesNotMatch(js, /data\/chargers\.json/);
  assert.doesNotMatch(html, /NDW\/DOT-NL/);
  assert.match(html, /EnBW mobility\+/);
});

test("responsive and reduced-motion rules are present", () => {
  assert.match(css, /@media \(max-width: 720px\)/);
  assert.match(css, /prefers-reduced-motion/);
});
