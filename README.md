# Charge Nearby

[![Validate static site](https://github.com/roelsroels/charge-nearby/actions/workflows/validate.yml/badge.svg)](https://github.com/roelsroels/charge-nearby/actions/workflows/validate.yml)

A dependency-free static mock-up for finding available public EV charging stations around a Dutch postcode. All publicly served files live in `html/`.

Live site: **https://roelsroels.github.io/charge-nearby/**

The current version uses realistic demonstration data around central Amsterdam. It is designed so the mock data can later be replaced by postcode geocoding through PDOK and live public charging data through NDW/DOT-NL.

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

The visible locations and availability are demonstration values and must not be used for navigation decisions. The production data concept is documented in `docs/DATA.md`.

## License

MIT
