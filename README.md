# Charge Nearby

[![Validate static site](https://github.com/roelsroels/charge-nearby/actions/workflows/validate.yml/badge.svg)](https://github.com/roelsroels/charge-nearby/actions/workflows/validate.yml)

A dependency-free static site for finding available public EV charging stations around an Amsterdam postcode. All publicly served files live in `html/`.

Live site: **https://roelsroels.github.io/charge-nearby/**

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

## License

MIT
