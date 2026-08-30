# Public data flow

The site uses public Dutch government and mobility data while remaining a static GitHub Pages deployment.

1. Convert the entered six-character postcode to an approximate street-segment centre through PDOK’s Location API.
2. Refresh an Amsterdam-wide NDW/DOT-NL snapshot during the GitHub Pages deployment every 15 minutes. This is necessary because the NDW GeoJSON API does not expose a browser CORS header.
3. Merge duplicate NDW features at the same coordinates and address, then publish only the fields the interface needs.
4. Apply an exact great-circle radius calculation in the browser and sort locations by distance.
5. Present availability as reported connector status, together with the snapshot age.

Important product wording: an available connector is not a guaranteed empty or accessible parking space. Tariffs can also differ by roaming provider.
