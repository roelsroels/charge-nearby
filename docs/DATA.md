# Private EnBW data flow

Charge Nearby now uses an on-demand local service because the EnBW endpoint rejects browser requests from origins other than EnBW’s own website.

1. The browser converts the entered six-character postcode to an approximate centre through PDOK’s Location API.
2. The browser requests `/api/chargers` from the same private Charge Nearby server with the centre and selected radius.
3. The server validates the radius and limits coordinates to the European Netherlands.
4. The server queries the EnBW mobility+ station endpoint with the configured `ENBW_API_KEY` and the headers expected by that endpoint.
5. EnBW can return grouped map markers without station IDs. The server follows each group viewport until it has individual stations, deduplicates them by EnBW station ID, and applies an exact great-circle radius filter.
6. Only fields needed by the interface are returned: station ID, coordinates, address, operator, connector types, power, total/available/unknown counts, opening, payment and accessibility indicators.
7. Successful searches are cached in memory for 60 seconds. A larger-radius cached search can satisfy a smaller-radius request around the same centre. Cached data up to 15 minutes old is used as a fallback during temporary EnBW failures.

## Security and privacy

- The real EnBW key is read only from the server environment and is never included in frontend files or API responses.
- `.env` is ignored by Git.
- The server binds to `127.0.0.1` by default. Set `HOST=0.0.0.0` only for a trusted LAN, VPN or protected reverse proxy.
- The application has no login screen or built-in access control.
- A postcode is sent to PDOK from the browser. The resulting coordinates and radius are sent to the private Charge Nearby server, which forwards only bounding-box coordinates to EnBW.

## Upstream behavior

The EnBW endpoint is an undocumented web-map backend, not a stable developer API. The hostname, key, required headers, response structure and grouping behavior can change. A rejected key produces a service error until `ENBW_API_KEY` is replaced and the process is restarted.

The previous NDW/DOT-NL snapshot was retired after an Amsterdam comparison found multiple stations in a commercial roaming app that were absent from the raw NDW response. That comparison established that the missing locations were absent upstream, rather than removed by this application's radius filtering. NDW should therefore not be used again as the only location source without a new coverage audit.

Important product wording: an available connector is operator/roaming-network status, not a guaranteed empty or accessible parking bay. Tariffs can differ by roaming provider, and operator names may differ between apps.
