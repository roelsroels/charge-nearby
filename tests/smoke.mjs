import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const html = fs.readFileSync(new URL("../html/index.html", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../html/styles.css", import.meta.url), "utf8");
const js = fs.readFileSync(new URL("../html/app.js", import.meta.url), "utf8");

test("static page exposes the core charging search", () => {
  assert.match(html, /id="charger-search"/);
  assert.match(html, /autocomplete="postal-code"/);
  assert.match(html, /name="radius" value="250"/);
  assert.match(html, /name="radius" value="2000"/);
  assert.match(html, /id="station-list"/);
  assert.match(html, /property="og:image" content="https:\/\/roelsroels\.github\.io\/charge-nearby\/og\.png"/);
  assert.equal(fs.existsSync(new URL("../html/og.png", import.meta.url)), true);
});

test("mock data and honest data wording stay present", () => {
  assert.match(js, /Nieuwezijds Voorburgwal/);
  assert.match(js, /available: 0/);
  assert.match(html, /realistic demonstration data/i);
  assert.match(html, /NDW\/DOT-NL/);
});

test("responsive and reduced-motion rules are present", () => {
  assert.match(css, /@media \(max-width: 720px\)/);
  assert.match(css, /prefers-reduced-motion/);
});
