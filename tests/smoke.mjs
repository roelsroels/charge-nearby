import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const html = fs.readFileSync(new URL("../html/index.html", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../html/styles.css", import.meta.url), "utf8");
const js = fs.readFileSync(new URL("../html/app.js", import.meta.url), "utf8");
const compose = fs.readFileSync(new URL("../compose.yaml", import.meta.url), "utf8");
const dockerfile = fs.readFileSync(new URL("../Dockerfile", import.meta.url), "utf8");
const nginx = fs.readFileSync(new URL("../nginx/charge-nearby.conf.example", import.meta.url), "utf8");
const readme = fs.readFileSync(new URL("../README.md", import.meta.url), "utf8");

test("page exposes the charging search", () => {
  assert.match(html, /id="charger-search"/);
  assert.match(html, /autocomplete="postal-code"/);
  assert.match(html, /name="radius" value="250"/);
  assert.match(html, /name="radius" value="2000"/);
  assert.match(html, /name="radius" value="250" checked/);
  assert.doesNotMatch(html, /name="radius" value="500" checked/);
  assert.match(html, /id="radius-summary">250 m</);
  assert.match(html, /app\.js\?v=1\.1\.3/);
  assert.match(html, /styles\.css\?v=1\.1\.3/);
  assert.match(html, /Available charger, <em>closeby<\/em>/);
  assert.match(html, /Public charging across the Netherlands/);
  assert.doesNotMatch(html, /A free charger/);
  assert.match(html, /href="https:\/\/github\.com\/roelsroels\/charge-nearby"[^>]*>Release v1\.1\.3<\/a>/);
  assert.doesNotMatch(html, /Unofficial private tool/);
  assert.match(html, /id="station-list"/);
  assert.match(html, /class="connected-overview-button"/);
  assert.match(html, /id="connected-overview-dialog"/);
  assert.match(html, /property="og:image" content="og\.png"/);
  assert.match(html, /href="vendor\/leaflet\/leaflet\.css\?v=1\.9\.4"/);
  assert.match(html, /src="vendor\/leaflet\/leaflet\.js\?v=1\.9\.4"/);
  assert.doesNotMatch(html, /unpkg\.com/);
  assert.equal(fs.existsSync(new URL("../html/og.png", import.meta.url)), true);
  assert.equal(fs.existsSync(new URL("../html/vendor/leaflet/LICENSE", import.meta.url)), true);
  assert.equal(fs.existsSync(new URL("../html/vendor/leaflet/leaflet.css", import.meta.url)), true);
  assert.equal(fs.existsSync(new URL("../html/vendor/leaflet/leaflet.js", import.meta.url)), true);
  assert.equal(fs.existsSync(new URL("../html/vendor/leaflet/images/layers.png", import.meta.url)), true);
  assert.equal(fs.existsSync(new URL("../html/vendor/leaflet/images/layers-2x.png", import.meta.url)), true);
  assert.equal(fs.existsSync(new URL("../html/vendor/leaflet/images/marker-icon.png", import.meta.url)), true);
  assert.equal(fs.existsSync(new URL("../html/vendor/leaflet/images/marker-icon-2x.png", import.meta.url)), true);
  assert.equal(fs.existsSync(new URL("../html/vendor/leaflet/images/marker-shadow.png", import.meta.url)), true);
  assert.equal(fs.existsSync(new URL("../docs/screenshots/charge-nearby-1012-js-overview.jpg", import.meta.url)), true);
  assert.equal(fs.existsSync(new URL("../docs/screenshots/charge-nearby-1012-js-results.jpg", import.meta.url)), true);
  assert.match(readme, /longest-connected overview for postcode 1012 JS/);
  assert.match(readme, /ranks occupied connectors in the selected search/);
  assert.match(readme, /represents approximate plug-in time/);
});

test("postcode and private EnBW API paths stay present", () => {
  assert.match(js, /api\.pdok\.nl\/kadaster\/location-api/);
  assert.match(js, /api\/chargers/);
  assert.match(js, /api\/charger-details/);
  assert.match(js, /Show connector details/);
  assert.match(js, /card-details-button/);
  assert.match(js, /details\.dataset\.variant = "card"/);
  assert.match(css, /\.card-connector-list \{ max-height: none;/);
  assert.match(js, /covers the European Netherlands/);
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
  assert.match(css, /\.station-grid \{ display: grid; grid-template-columns: repeat\(3,/);
  assert.match(css, /\.station-card \{ min-height: 185px;/);
  assert.doesNotMatch(css, /\.station-grid \{[^}]*overflow-y: auto/);
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

test("occupied connector age is presented as an approximate connected duration", () => {
  assert.match(js, /function connectorAgeText/);
  assert.match(js, /"OCCUPIED", "CHARGING", "SUSPENDED_EV", "SUSPENDED_EVSE"/);
  assert.match(js, /connected ~\$\{age/);
  assert.match(readme, /approximate time since EnBW recorded that occupied state/);
});

test("longest-connected overview is scoped to the active search circle", () => {
  assert.match(js, /mode", "overview"/);
  assert.match(js, /url\.searchParams\.set\("radius", String\(activeRadius\)\)/);
  assert.match(js, /connected\.slice\(0, 20\)/);
  assert.match(js, /longest first/);
  assert.match(css, /\.connected-dialog/);
  assert.match(css, /\.connected-ranking-item/);
});

test("stations omitted by a later response remain visibly unavailable", () => {
  assert.match(html, /No current data/);
  assert.match(js, /station\.current === false/);
  assert.match(js, /is-unavailable/);
  assert.match(js, /Number\(b\.current !== false\) - Number\(a\.current !== false\)/);
  assert.match(css, /\.station-card\.is-unavailable/);
  assert.match(css, /\.charger-pin\.unavailable/);
  assert.match(dockerfile, /ENV STATION_HISTORY_FILE=\/data\/stations\.json/);
  assert.match(dockerfile, /VOLUME \["\/data"\]/);
  assert.match(compose, /- "127\.0\.0\.1:8089:8080"/);
  assert.doesNotMatch(compose, /- "8089:8080"/);
  assert.doesNotMatch(compose, /STATION_HISTORY_FILE/);
  assert.match(compose, /MAX_CONCURRENT_SEARCHES: \$\{MAX_CONCURRENT_SEARCHES:-2\}/);
  assert.match(nginx, /proxy_pass http:\/\/127\.0\.0\.1:8089/);
});

test("responsive and reduced-motion rules are present", () => {
  assert.match(css, /@media \(max-width: 720px\)/);
  assert.match(css, /prefers-reduced-motion/);
  assert.doesNotMatch(css, /\.intro \{[^}]*min-height:\s*430px/);
  assert.match(css, /\.intro h1 \{[^}]*white-space:\s*nowrap/);
  assert.match(css, /\.finder \{[^}]*min-height:\s*540px/);
});

test("nginx example constrains the public API and browser capabilities", () => {
  assert.match(nginx, /limit_req_zone \$binary_remote_addr zone=charge_nearby_api:10m rate=12r\/m/);
  assert.match(nginx, /location = \/api\/chargers/);
  assert.match(nginx, /location = \/api\/charger-details/);
  assert.match(nginx, /limit_req zone=charge_nearby_api burst=4 nodelay/);
  assert.match(nginx, /limit_conn charge_nearby_api_connections 2/);
  assert.match(nginx, /location = \/api\/health/);
  assert.match(nginx, /allow 192\.168\.1\.0\/24/);
  assert.match(nginx, /location \^~ \/api\//);
  assert.match(nginx, /add_header Content-Security-Policy .*frame-ancestors 'none'.* always;/);
  assert.match(nginx, /add_header X-Frame-Options "DENY" always;/);
  assert.match(nginx, /server_name example\.com/);
  assert.match(nginx, /add_header Cross-Origin-Embedder-Policy "credentialless" always;/);
  assert.match(nginx, /add_header Cross-Origin-Opener-Policy "same-origin" always;/);
  assert.match(nginx, /add_header Cross-Origin-Resource-Policy "same-origin" always;/);
  assert.match(nginx, /return 301 https:\/\/\$host\$request_uri/);
  assert.match(readme, /Existing nginx installations upgrading to v1\.1\.1 or later must add/);
  assert.match(readme, /HTML 404 page headed `nginx`/);
});
