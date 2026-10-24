# Changelog

All notable changes to Charge Nearby are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Add a complete Dutch interface alongside English, including search feedback,
  station states, map popups, connector details and the longest-connected view.
- Add an accessible `EN` / `NL` selector in the top-right header and remember the
  selected language in browser-local storage.

### Fixed

- Reconcile replaced EnBW station IDs with their matching physical charging
  locations instead of retaining the old IDs as accumulating gray duplicates.
- Preserve genuinely missing stations when no unique physical replacement can be
  identified, including ambiguous sites with multiple otherwise identical stations.
- Migrate browser-local station and connector favorites from superseded station
  IDs to their replacements.

## [1.3.1] - 2026-10-18

### Added

- Add an RFC 9116 `security.txt` deployment pattern that serves the real contact
  file from outside the repository.
- Add enforced line, branch and function coverage thresholds, CodeQL analysis,
  container vulnerability scanning, live deployment-header checks and OpenSSF
  Scorecard monitoring.
- Add verified README badges for releases, runtime requirements, deployment,
  coverage, security checks and project metadata, plus automated badge validation.
- Add weekly Dependabot checks for Docker and GitHub Actions dependencies.

### Changed

- Keep automated container updates on the supported Node.js 22 major release.
- Update the pinned OpenSSF artifact-upload action.
- Align the application fallback headers and nginx example with the production
  security policy.

### Security

- Remove the CSP `unsafe-inline` style allowance and explicitly deny inline style
  attributes.
- Reduce the runtime container attack surface and pin infrastructure dependencies.
- Validate the live CSP, security headers and deployed `security.txt` automatically.

## [1.3.0] - 2026-10-16

### Added

- Add browser-local favorites for individual connectors, separate from station
  favorites.
- Add automatic availability refreshes for visible favorite connectors.
- Promote stations with an available favorite connector to the top of the results.
- Highlight available favorite connectors with a coral card, stronger map ring,
  heart badge and availability notice.
- Add a compact page-reload control beside the charging-data freshness indicator.

### Changed

- Refresh the 1012 JS overview and connector-detail screenshots.

## [1.2.0] - 2026-10-04

### Added

- Add station filtering by connector family and minimum charging speed.
- Distinguish AC, DC and HPC chargers on the map while retaining their separate
  availability colors.
- Show connector details in charger overview cards and load filtered detail data
  only when needed.
- Add a default `robots.txt` that permits ordinary indexing while keeping the API
  outside the indexed site content.

### Changed

- Compact charger cards to reduce page length while retaining normal page scrolling.
- Prioritize favorites consistently in map and list views.
- Allow map popups and the longest-connected dialog to close with Escape or an
  outside click.

## [1.1.3] - 2026-09-15

### Added

- Add a `Longest connected` overview that scans stations in the selected search
  circle and ranks occupied connectors by approximate plug-in duration.
- Scope the overview to the active radius and cap the number of stations scanned to
  bound upstream EnBW requests.

## [1.1.2] - 2026-09-15

### Added

- Show approximate connected duration for occupied connectors using EnBW's status
  timestamp, regardless of whether power is actively flowing.

### Changed

- Keep neutral update-age wording for available, reserved, unknown and
  out-of-service connectors.
- Refresh the 1012 JS screenshots with expanded connector details and connected
  duration examples.
- Clarify connector-detail behavior and the required nginx route in the documentation.

## [1.1.1] - 2026-09-15

### Added

- Enrich station popups with operator, distance, connector type, maximum power,
  opening, payment, accessibility and data-freshness information.
- Load per-EVSE connector status, power, cable information and status age from EnBW
  only when requested.
- Add short-lived connector-detail caching and restrict detail requests to stations
  returned by a preceding search.

### Changed

- Deliberately exclude tariff and pricing data.
- Document the required public `/api/charger-details` nginx route and its fail-closed
  behavior.

## [1.1.0] - 2026-09-14

### Added

- Add API request and connection limits at the public nginx edge.
- Add an application-wide limit for concurrent uncached EnBW searches.
- Self-host Leaflet assets.
- Add Content Security Policy, frame protection and cross-origin isolation/resource
  headers to the nginx example and application fallback.

### Security

- Bind the Docker-published port to host loopback by default.
- Fail closed for unrecognized API routes while keeping the browser-required routes
  public and rate limited.
- Expand deployment hardening and API-key container-recreation guidance.

## [1.0.7] - 2026-09-05

### Changed

- Use host port 8089 with container port 8080.
- Move station-history defaults into the Docker image to keep `compose.yaml` minimal.
- Update the nginx example and deployment documentation for port 8089.

## [1.0.6] - 2026-09-05

### Added

- Remember charging stations seen during the previous 30 days.
- Show stations omitted from a successful EnBW response as gray `No current data`
  markers and result cards.
- Persist the last-seen station catalogue across container rebuilds in the Docker
  data volume.

### Changed

- Exclude remembered stations without current data from the available count and
  place them below current results while preserving favorite-first sorting.

## [1.0.5] - 2026-09-01

### Added

- Expand postcode and charger searches from Amsterdam to the European Netherlands.
- Add a geographic boundary that prevents arbitrary worldwide use of the private
  EnBW proxy.

### Changed

- Update interface copy and documentation for nationwide coverage.

## [1.0.4] - 2026-09-01

### Changed

- Link the footer release number to the GitHub repository.
- Simplify the surrounding footer attribution text.

## [1.0.3] - 2026-08-31

### Added

- Display the deployed release version in the page footer.

## [1.0.2] - 2026-08-31

### Added

- Keep charging-data freshness labels current during long-running browser sessions.
- Refresh relative minute, hour and day labels every ten seconds and whenever an
  idle tab becomes visible or focused again.

## [1.0.1] - 2026-08-31

### Added

- Remember the last successfully searched postcode in browser-local storage and
  restore it on the next visit.
- Retain 1012 JS as the fallback for first-time visitors, invalid saved values and
  browsers where local storage is unavailable.

## [1.0.0] - 2026-08-31

### Added

- Add live public charging locations and connector availability around Amsterdam
  postcodes through a private server-side EnBW integration.
- Add exact-distance searches with 250 m, 500 m, 1 km and 2 km radii.
- Add persistent browser-local station favorites, map highlighting and
  favorite-first result sorting.
- Add favorite controls to result cards and map popups.
- Add a compact responsive interface that keeps the desktop finder visible on
  initial load.
- Add EnBW grouped-marker expansion, response caching and stale-data fallback.
- Add Docker Compose, direct Node.js and nginx reverse-proxy deployment options.
- Add automated API, server, frontend and favorites checks.

[Unreleased]: https://github.com/roelsroels/charge-nearby/compare/v1.3.1...HEAD
[1.3.1]: https://github.com/roelsroels/charge-nearby/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/roelsroels/charge-nearby/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/roelsroels/charge-nearby/compare/v1.1.3...v1.2.0
[1.1.3]: https://github.com/roelsroels/charge-nearby/compare/v1.1.2...v1.1.3
[1.1.2]: https://github.com/roelsroels/charge-nearby/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/roelsroels/charge-nearby/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/roelsroels/charge-nearby/compare/v1.0.7...v1.1.0
[1.0.7]: https://github.com/roelsroels/charge-nearby/compare/v1.0.6...v1.0.7
[1.0.6]: https://github.com/roelsroels/charge-nearby/compare/v1.0.5...v1.0.6
[1.0.5]: https://github.com/roelsroels/charge-nearby/compare/v1.0.4...v1.0.5
[1.0.4]: https://github.com/roelsroels/charge-nearby/compare/v1.0.3...v1.0.4
[1.0.3]: https://github.com/roelsroels/charge-nearby/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/roelsroels/charge-nearby/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/roelsroels/charge-nearby/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/roelsroels/charge-nearby/releases/tag/v1.0.0
