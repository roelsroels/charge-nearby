# Production data concept

The mock-up is deliberately separated from the eventual live-data implementation.

1. Convert a full Dutch postcode, preferably with house number, into coordinates through PDOK/BAG.
2. Request a small bounding box from the NDW DOT-NL GeoJSON API.
3. Apply an exact radius calculation in the application and sort locations by distance.
4. Present availability as reported connector status, with the source timestamp visible.
5. Keep a thin server-side adapter or scheduled static snapshot between the public website and upstream APIs so format changes, rate limits, and temporary outages do not break the interface.

Important product wording: an available connector is not a guaranteed empty or accessible parking space. Tariffs can also differ by roaming provider.
