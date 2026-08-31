# Charge Nearby

[![Validate static site](https://github.com/roelsroels/charge-nearby/actions/workflows/validate.yml/badge.svg)](https://github.com/roelsroels/charge-nearby/actions/workflows/validate.yml)

A dependency-free static site for finding available public EV charging stations around an Amsterdam postcode. All publicly served files live in `html/`.

Live site: **https://roelsroels.github.io/charge-nearby/**

> [!NOTE]
> Development is paused. The prototype remains online, but its charger coverage should not be treated as complete. See the known data limitation below.

Postcodes are geocoded in the browser with PDOK’s public Location API. Charger locations and connector availability come from NDW/DOT-NL. Because the NDW endpoint does not currently allow cross-origin browser requests, GitHub Pages rebuilds a same-origin Amsterdam snapshot every 15 minutes.

## Run locally

```sh
python3 -m http.server 8080 --directory html
```

Then open `http://localhost:8080`.

## Hosting

Serve the `html/` directory from any static host or web server. No build step, database, package manager, cookies, analytics, or server-side runtime is required.

An example nginx virtual host is included in `nginx/charge-nearby.conf.example`. If the site later moves to a custom domain, update the absolute `og.png` social-preview URLs in `html/index.html`.

## Checks

```sh
node --check html/app.js
node --test tests/smoke.mjs
```

## Data note

Availability is operator-reported connector status and can lag or be incorrect. It does not guarantee that the corresponding parking bay is empty or accessible. The data flow is documented in `docs/DATA.md`.

### Known limitation: incomplete charger coverage

The NDW/DOT-NL feed used by this prototype does not contain every public charging location shown by commercial roaming apps. This is an upstream data-coverage limitation, not a radius-filtering or map-rendering issue in the site.

The issue was verified around postcode `1095 DE`:

- NDW returned 17 raw locations within 500 metres, and the site retained all 17 after processing.
- All 17 locations were operated by TotalEnergies; numerous nearby Equans locations visible in Electroverse were absent from the raw NDW response.
- As a concrete example, the Equans station at `Tweede Ceramstraat 27, 1095 BM` was not present in NDW. The nearest NDW location was a TotalEnergies station at `88 Soembawastraat`, approximately 35 metres away.

DOT-NL depends on data supplied by charge-point operators and owners, so its coverage can be incomplete. Electroverse has access to a broader commercial roaming and partner network and can therefore show locations that are missing from the public feed. The 15-minute snapshot interval may make availability slightly stale, but it does not explain permanently missing locations. Postcode-centre and radius differences can affect stations near the edge of a search, but do not explain the nearby missing Equans stations in this example.

If the project is revived, possible approaches are:

- integrate a licensed roaming or operator feed with more complete coverage;
- supplement static locations with OpenStreetMap, accepting that it does not provide reliable live connector availability;
- report missing locations to NDW or the relevant charge-point operator; and
- add a prominent in-product coverage disclaimer rather than presenting the results as exhaustive.

## License

MIT
