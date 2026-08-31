(() => {
  "use strict";

  const DEFAULT_CENTRE = [52.37276, 4.89362];
  const PDOK_SEARCH_URL = "https://api.pdok.nl/kadaster/location-api/v1/search";
  const CHARGER_API_URL = "api/chargers";

  let map;
  let stationLayer;
  let radiusLayer;
  let centreMarker;
  let searchCentre = DEFAULT_CENTRE;
  let activeRadius = 250;
  let stations = [];
  let dataMeta = null;
  let searchRequestId = 0;
  const markers = new Map();

  const byId = (id) => document.getElementById(id);
  const formatDistance = (metres) => metres < 1000 ? `${Math.round(metres)} m` : `${(metres / 1000).toFixed(1)} km`;

  function normalisePostcode(value) {
    return String(value || "").toUpperCase().replace(/\s+/g, "");
  }

  function formatPostcode(value) {
    const postcode = normalisePostcode(value);
    return `${postcode.slice(0, 4)} ${postcode.slice(4)}`;
  }

  function haversineMetres([lat1, lon1], [lat2, lon2]) {
    const toRadians = (degrees) => degrees * Math.PI / 180;
    const earthRadius = 6371000;
    const deltaLat = toRadians(lat2 - lat1);
    const deltaLon = toRadians(lon2 - lon1);
    const a = Math.sin(deltaLat / 2) ** 2
      + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(deltaLon / 2) ** 2;
    return 2 * earthRadius * Math.asin(Math.sqrt(a));
  }

  function dataAgeText() {
    if (!dataMeta?.generatedAt) return "update time unavailable";
    const ageMinutes = Math.max(0, Math.round((Date.now() - new Date(dataMeta.generatedAt).getTime()) / 60000));
    if (ageMinutes < 2) return "updated just now";
    if (ageMinutes < 60) return `updated ${ageMinutes} min ago`;
    const hours = Math.round(ageMinutes / 60);
    return `updated ${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  }

  function updateDataBadge() {
    const badge = document.querySelector(".live-pill");
    const ageMinutes = dataMeta?.generatedAt
      ? (Date.now() - new Date(dataMeta.generatedAt).getTime()) / 60000
      : Infinity;
    badge.dataset.state = dataMeta?.cache === "stale" || ageMinutes > 15 ? "stale" : "current";
    badge.lastChild.textContent = ` EnBW · ${dataAgeText()}`;
  }

  function availabilityState(station) {
    if (!station.known || !station.total) return { className: " unknown", text: "Status unknown" };
    if (station.available === 0) return { className: " busy", text: `All ${station.total} occupied` };
    return {
      className: station.available === 1 ? " limited" : "",
      text: `${station.available} of ${station.total} available`
    };
  }

  function stationCard(station) {
    const article = document.createElement("article");
    article.className = "station-card";
    article.tabIndex = 0;
    article.dataset.stationId = station.id;

    const top = document.createElement("div");
    top.className = "station-card-top";
    const distance = document.createElement("span");
    distance.className = "distance";
    distance.textContent = `${formatDistance(station.distance)} AWAY`;
    const availability = document.createElement("span");
    const state = availabilityState(station);
    availability.className = `availability${state.className}`;
    availability.textContent = state.text;
    top.append(distance, availability);

    const body = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = station.address || "Public charging location";
    const subtitle = document.createElement("p");
    subtitle.className = "station-address";
    subtitle.textContent = station.operator || "Operator not supplied";
    body.append(title, subtitle);

    const footer = document.createElement("div");
    footer.className = "station-meta";
    const facts = document.createElement("div");
    facts.className = "station-meta-list";
    const power = document.createElement("span");
    power.textContent = station.powerKw ? `⚡ up to ${Math.round(station.powerKw)} kW` : "Power unknown";
    const connector = document.createElement("span");
    if (station.connectors?.includes("TYPE_2")) connector.textContent = "Type 2";
    else if (station.connectors?.some((type) => type.includes("CCS"))) connector.textContent = "CCS";
    else connector.textContent = station.connectorNames?.[0] || "Public EVSE";
    facts.append(power, connector);
    const directions = document.createElement("a");
    directions.className = "directions-link";
    directions.href = `https://www.openstreetmap.org/?mlat=${station.position[0]}&mlon=${station.position[1]}#map=18/${station.position[0]}/${station.position[1]}`;
    directions.target = "_blank";
    directions.rel = "noreferrer";
    directions.textContent = "Directions ↗";
    footer.append(facts, directions);

    article.append(top, body, footer);
    article.addEventListener("mouseenter", () => highlightStation(station.id));
    article.addEventListener("focus", () => highlightStation(station.id));
    article.addEventListener("mouseleave", clearHighlights);
    article.addEventListener("blur", clearHighlights);
    return article;
  }

  function highlightStation(id) {
    document.querySelectorAll(".station-card").forEach((card) => card.classList.toggle("is-highlighted", card.dataset.stationId === id));
    const marker = markers.get(id);
    if (marker && map) marker.openPopup();
  }

  function clearHighlights() {
    document.querySelectorAll(".station-card").forEach((card) => card.classList.remove("is-highlighted"));
  }

  function pinIcon(station) {
    const state = !station.known ? " unknown" : station.available === 0 ? " busy" : "";
    const label = station.known && station.total ? `${station.available}/${station.total}` : "?";
    return L.divIcon({ className: `charger-pin${state}`, html: `<span>${label}</span>` });
  }

  function visibleStations() {
    return stations
      .map((station) => ({ ...station, distance: haversineMetres(searchCentre, station.position) }))
      .filter((station) => station.distance <= activeRadius)
      .sort((a, b) => a.distance - b.distance || b.available - a.available);
  }

  function createPopup(station) {
    const content = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = station.address || "Public charging location";
    const status = document.createElement("div");
    status.textContent = availabilityState(station).text;
    content.append(title, status);
    return content;
  }

  function render() {
    const visible = visibleStations();
    const available = visible.reduce((sum, station) => sum + (station.known ? station.available : 0), 0);
    const list = byId("station-list");
    list.replaceChildren();

    if (visible.length) {
      visible.forEach((station) => list.append(stationCard(station)));
    } else {
      list.innerHTML = `<div class="empty-state"><h3>No public chargers found this close</h3><p>Try increasing the search radius.</p></div>`;
    }

    byId("available-count").textContent = String(available);
    byId("location-count").textContent = String(visible.length);
    byId("radius-summary").textContent = activeRadius < 1000 ? `${activeRadius} m` : `${activeRadius / 1000} km`;

    if (!map) return;
    stationLayer.clearLayers();
    markers.clear();
    visible.forEach((station) => {
      const marker = L.marker(station.position, {
        icon: pinIcon(station),
        title: `${station.address}: ${availabilityState(station).text}`
      }).bindPopup(createPopup(station)).addTo(stationLayer);
      markers.set(station.id, marker);
    });
    if (radiusLayer) radiusLayer.remove();
    radiusLayer = L.circle(searchCentre, { radius: activeRadius, className: "radius-circle" }).addTo(map);
    centreMarker.setLatLng(searchCentre);
    map.fitBounds(radiusLayer.getBounds(), { padding: [42, 42], animate: false });
  }

  function setSearchState(state, message) {
    const input = byId("postcode");
    const button = document.querySelector(".search-button");
    const label = button.querySelector(".button-label");
    const help = byId("postcode-help");
    const loading = state === "loading";
    button.disabled = loading;
    input.disabled = loading;
    document.querySelectorAll('input[name="radius"]').forEach((radiusInput) => {
      radiusInput.disabled = loading;
    });
    label.textContent = loading ? "Finding chargers…" : "Find chargers";
    help.dataset.state = state;
    help.textContent = message;
    if (state === "error") input.setAttribute("aria-invalid", "true");
    else input.removeAttribute("aria-invalid");
  }

  async function geocodePostcode(postcode) {
    const url = new URL(PDOK_SEARCH_URL);
    url.searchParams.set("q", formatPostcode(postcode));
    url.searchParams.set("adres[version]", "1");
    url.searchParams.set("limit", "50");
    url.searchParams.set("f", "json");
    const response = await fetch(url, { headers: { Accept: "application/geo+json, application/json" } });
    if (!response.ok) throw new Error(`PDOK returned ${response.status}`);
    const payload = await response.json();
    const wanted = normalisePostcode(postcode);
    const matches = (payload.features || []).filter((feature) => {
      const displayName = feature.properties?.display_name || "";
      const found = displayName.match(/\b\d{4}\s?[A-Z]{2}\b/i);
      return feature.geometry?.type === "Point"
        && found && normalisePostcode(found[0]) === wanted
        && feature.geometry.coordinates?.length >= 2;
    });
    if (!matches.length) return null;
    const total = matches.reduce((result, feature) => {
      result.lon += Number(feature.geometry.coordinates[0]);
      result.lat += Number(feature.geometry.coordinates[1]);
      return result;
    }, { lat: 0, lon: 0 });
    return {
      centre: [total.lat / matches.length, total.lon / matches.length],
      displayName: matches[0].properties?.display_name || formatPostcode(postcode)
    };
  }

  async function loadChargerData([lat, lon], radius) {
    const url = new URL(CHARGER_API_URL, window.location.href);
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lon));
    url.searchParams.set("radius", String(radius));
    const response = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `Charging service returned ${response.status}`);
    if (!Array.isArray(payload.stations)) throw new Error("Invalid charging response");
    dataMeta = payload;
    stations = payload.stations
      .filter((station) => Array.isArray(station.position) && station.position.length === 2)
      .map((station) => ({
        ...station,
        position: [Number(station.position[0]), Number(station.position[1])],
        available: Number(station.available) || 0,
        total: Number(station.total) || 0
      }));
    updateDataBadge();
    return payload;
  }

  async function searchPostcode(rawPostcode) {
    const input = byId("postcode");
    const postcode = normalisePostcode(rawPostcode);
    if (!/^\d{4}[A-Z]{2}$/.test(postcode)) {
      setSearchState("error", "Enter a Dutch postcode such as 1095 DE.");
      input.focus();
      return;
    }

    const requestId = ++searchRequestId;
    setSearchState("loading", "Looking up the postcode…");
    try {
      const location = await geocodePostcode(postcode);
      if (!location) throw new Error("postcode-not-found");
      setSearchState("loading", "Resolving current EnBW charging availability…");
      await loadChargerData(location.centre, activeRadius);
      if (requestId !== searchRequestId) return;
      searchCentre = location.centre;
      const formatted = formatPostcode(postcode);
      input.value = formatted;
      byId("postcode-result").textContent = formatted;
      byId("map").setAttribute("aria-label", `Map showing public charging stations around postcode ${formatted}`);
      const cacheNote = dataMeta.cache === "stale" ? " · showing cached data" : "";
      setSearchState("success", `Centred on ${formatted} · EnBW charging data ${dataAgeText()}${cacheNote}.`);
      render();
    } catch (error) {
      if (error.message === "postcode-not-found") {
        setSearchState("error", "That postcode could not be found in the Dutch address register.");
      } else if (/limited to Amsterdam/i.test(error.message)) {
        setSearchState("error", "This private deployment currently covers Amsterdam and its immediate surroundings.");
      } else if (/too many grouped stations|smaller radius/i.test(error.message)) {
        setSearchState("error", "This area is too dense for that radius. Try a smaller search radius.");
      } else {
        setSearchState("error", `Charging data is temporarily unavailable: ${error.message}`);
      }
      input.focus();
    }
  }

  function initialiseMap() {
    if (!window.L) {
      document.querySelector(".map-panel").classList.add("map-unavailable");
      byId("map").innerHTML = "<p>Map tiles could not be loaded. The station list is still available below.</p>";
      return;
    }
    map = L.map("map", { zoomControl: true, scrollWheelZoom: false, attributionControl: true }).setView(searchCentre, 15);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors"
    }).addTo(map);
    stationLayer = L.layerGroup().addTo(map);
    centreMarker = L.marker(searchCentre, {
      icon: L.divIcon({ className: "search-centre" }),
      title: "Postcode centre"
    }).addTo(map);
  }

  document.querySelectorAll('input[name="radius"]').forEach((input) => {
    input.addEventListener("change", () => {
      activeRadius = Number(input.value);
      searchPostcode(byId("postcode").value);
    });
  });

  byId("charger-search").addEventListener("submit", (event) => {
    event.preventDefault();
    searchPostcode(byId("postcode").value);
  });

  document.querySelector(".map-list-toggle").addEventListener("click", (event) => {
    const button = event.currentTarget;
    const pressed = button.getAttribute("aria-pressed") === "true";
    button.setAttribute("aria-pressed", String(!pressed));
    document.querySelector(".toggle-text").textContent = pressed ? "Show list" : "Back to map";
    (pressed ? document.querySelector(".map-panel") : byId("results")).scrollIntoView({ behavior: "smooth", block: "start" });
  });

  window.addEventListener("load", () => {
    initialiseMap();
    searchPostcode(byId("postcode").value);
  }, { once: true });
})();
