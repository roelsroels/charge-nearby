(() => {
  "use strict";

  const DEFAULT_CENTRE = [52.37276, 4.89362];
  const PDOK_SEARCH_URL = "https://api.pdok.nl/kadaster/location-api/v1/search";
  const CHARGER_API_URL = "api/chargers";
  const CHARGER_DETAIL_API_URL = "api/charger-details";
  const FAVORITES_STORAGE_KEY = "charge-nearby:favorites:v1";
  const LAST_POSTCODE_STORAGE_KEY = "charge-nearby:last-postcode:v1";

  let map;
  let stationLayer;
  let radiusLayer;
  let centreMarker;
  let searchCentre = DEFAULT_CENTRE;
  let activeRadius = Number(document.querySelector('input[name="radius"]:checked')?.value) || 250;
  let stations = [];
  let dataMeta = null;
  let activePostcode = null;
  let dataAgeTimer = null;
  let searchRequestId = 0;
  const markers = new Map();
  const connectorDetails = new Map();
  const favorites = loadFavoriteIds();

  const byId = (id) => document.getElementById(id);
  const formatDistance = (metres) => metres < 1000 ? `${Math.round(metres)} m` : `${(metres / 1000).toFixed(1)} km`;

  function loadFavoriteIds() {
    try {
      const stored = JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY) || "[]");
      return new Set(Array.isArray(stored) ? stored.filter((id) => typeof id === "string") : []);
    } catch {
      return new Set();
    }
  }

  function saveFavoriteIds() {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...favorites]));
    } catch {
      // Favorites still work for this page view when storage is unavailable.
    }
  }

  function normalisePostcode(value) {
    return String(value || "").toUpperCase().replace(/\s+/g, "");
  }

  function formatPostcode(value) {
    const postcode = normalisePostcode(value);
    return `${postcode.slice(0, 4)} ${postcode.slice(4)}`;
  }

  function loadLastPostcode() {
    try {
      const postcode = normalisePostcode(localStorage.getItem(LAST_POSTCODE_STORAGE_KEY));
      return /^\d{4}[A-Z]{2}$/.test(postcode) ? formatPostcode(postcode) : null;
    } catch {
      return null;
    }
  }

  function saveLastPostcode(postcode) {
    try {
      localStorage.setItem(LAST_POSTCODE_STORAGE_KEY, formatPostcode(postcode));
    } catch {
      // The search still works when browser storage is unavailable.
    }
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

  function relativeAgeText(timestamp) {
    const parsed = new Date(timestamp).getTime();
    if (!Number.isFinite(parsed)) return null;
    const ageSeconds = Math.max(0, Math.floor((Date.now() - parsed) / 1000));
    if (ageSeconds < 60) return "updated just now";
    const minutes = Math.floor(ageSeconds / 60);
    if (minutes < 60) return `updated ${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `updated ${hours} ${hours === 1 ? "hour" : "hours"} ago`;
    const days = Math.floor(hours / 24);
    return `updated ${days} ${days === 1 ? "day" : "days"} ago`;
  }

  function dataAgeText() {
    return relativeAgeText(dataMeta?.generatedAt) || "update time unavailable";
  }

  function updateDataBadge() {
    const badge = document.querySelector(".live-pill");
    const ageMinutes = dataMeta?.generatedAt
      ? (Date.now() - new Date(dataMeta.generatedAt).getTime()) / 60000
      : Infinity;
    badge.dataset.state = dataMeta?.cache === "stale" || ageMinutes > 15 ? "stale" : "current";
    badge.lastChild.textContent = ` EnBW · ${dataAgeText()}`;
  }

  function updateDataFreshnessLabels() {
    if (!dataMeta?.generatedAt) return;
    updateDataBadge();
    const help = byId("postcode-help");
    if (!activePostcode || help.dataset.state !== "success") return;
    const cacheNote = dataMeta?.cache === "stale" ? " · showing cached data" : "";
    help.textContent = `Centred on ${activePostcode} · EnBW charging data ${dataAgeText()}${cacheNote}.`;
  }

  function startDataAgeClock() {
    if (dataAgeTimer === null) dataAgeTimer = window.setInterval(updateDataFreshnessLabels, 10000);
  }

  function availabilityState(station) {
    if (station.current === false) return { className: " unavailable", text: "No current data" };
    if (!station.known || !station.total) return { className: " unknown", text: "Status unknown" };
    if (station.available === 0) return { className: " busy", text: `All ${station.total} occupied` };
    return {
      className: station.available === 1 ? " limited" : "",
      text: `${station.available} of ${station.total} available`
    };
  }

  function stationCard(station) {
    const article = document.createElement("article");
    article.className = `station-card${favorites.has(station.id) ? " is-favorite" : ""}${station.current === false ? " is-unavailable" : ""}`;
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
    const controls = document.createElement("div");
    controls.className = "station-card-controls";
    const favorite = document.createElement("button");
    favorite.className = "favorite-button";
    favorite.type = "button";
    setFavoriteButtonState(favorite, station);
    favorite.addEventListener("click", () => toggleFavorite(station));
    controls.append(availability, favorite);
    top.append(distance, controls);

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

  function setFavoriteButtonState(button, station) {
    const selected = favorites.has(station.id);
    const action = selected ? "Remove" : "Add";
    button.dataset.favoriteStationId = station.id;
    button.setAttribute("aria-pressed", String(selected));
    button.setAttribute("aria-label", `${action} ${station.address || "this charging location"} ${selected ? "from" : "to"} favorites`);
    button.title = `${action} ${selected ? "from" : "to"} favorites`;
    button.textContent = button.classList.contains("popup-favorite-button")
      ? selected ? "♥ Favorite" : "♡ Add favorite"
      : selected ? "♥" : "♡";
  }

  function toggleFavorite(station) {
    if (favorites.has(station.id)) favorites.delete(station.id);
    else favorites.add(station.id);
    saveFavoriteIds();

    document.querySelectorAll(".station-card").forEach((card) => {
      if (card.dataset.stationId !== station.id) return;
      card.classList.toggle("is-favorite", favorites.has(station.id));
    });
    document.querySelectorAll(".favorite-button").forEach((button) => {
      if (button.dataset.favoriteStationId === station.id) setFavoriteButtonState(button, station);
    });
    sortStationCards();
    const marker = markers.get(station.id);
    if (marker) {
      marker.setIcon(pinIcon(station));
      marker.options.title = markerTitle(station);
      marker.getElement()?.setAttribute("title", marker.options.title);
    }
  }

  function sortStationCards() {
    const list = byId("station-list");
    const cards = new Map([...list.querySelectorAll(".station-card")].map((card) => [card.dataset.stationId, card]));
    visibleStations().forEach((station) => {
      const card = cards.get(station.id);
      if (card) list.append(card);
    });
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
    const state = station.current === false ? " unavailable" : !station.known ? " unknown" : station.available === 0 ? " busy" : "";
    const favorite = favorites.has(station.id) ? " favorite" : "";
    const label = station.known && station.total ? `${station.available}/${station.total}` : "?";
    const favoriteBadge = favorite ? '<i aria-hidden="true">♥</i>' : "";
    return L.divIcon({ className: `charger-pin${state}${favorite}`, html: `<span>${label}</span>${favoriteBadge}` });
  }

  function visibleStations() {
    return stations
      .map((station) => ({ ...station, distance: haversineMetres(searchCentre, station.position) }))
      .filter((station) => station.distance <= activeRadius)
      .sort((a, b) => Number(favorites.has(b.id)) - Number(favorites.has(a.id))
        || Number(b.current !== false) - Number(a.current !== false)
        || a.distance - b.distance
        || b.available - a.available);
  }

  function markerTitle(station) {
    return `${favorites.has(station.id) ? "Favorite · " : ""}${station.address}: ${availabilityState(station).text}`;
  }

  function stationFacts(station) {
    const facts = [];
    const connectorNames = [...new Set((station.connectorNames || []).filter(Boolean))];
    if (connectorNames.length) facts.push(connectorNames.join(", "));
    if (station.powerKw) facts.push(`Up to ${Math.round(station.powerKw)} kW`);
    if (station.alwaysOpen === true) facts.push("Open 24/7");
    if (station.payment === true) facts.push("Payment supported");
    if (station.accessible === true) facts.push("Accessible");
    if (station.unknown > 0) facts.push(`${station.unknown} ${station.unknown === 1 ? "status" : "statuses"} unknown`);
    return facts;
  }

  function connectorStatus(status) {
    const normalized = String(status || "UNKNOWN").toUpperCase();
    const labels = {
      AVAILABLE: "Available",
      OCCUPIED: "Occupied",
      OUT_OF_SERVICE: "Out of service",
      RESERVED: "Reserved",
      UNKNOWN: "Unknown"
    };
    return { value: normalized, label: labels[normalized] || normalized.replaceAll("_", " ").toLowerCase() };
  }

  function connectorAgeText(status, timestamp) {
    const age = relativeAgeText(timestamp);
    if (!age) return null;
    const connectedStates = new Set(["OCCUPIED", "CHARGING", "SUSPENDED_EV", "SUSPENDED_EVSE"]);
    if (!connectedStates.has(String(status || "").toUpperCase())) return age;
    if (age === "updated just now") return "connected <1 minute";
    return `connected ~${age.replace(/^updated /, "").replace(/ ago$/, "")}`;
  }

  function renderConnectorDetails(container, payload) {
    container.replaceChildren();
    if (!payload.chargePoints?.length) {
      container.textContent = "No individual connector information was supplied.";
      container.className = "popup-details-message";
      return;
    }

    const list = document.createElement("div");
    list.className = "popup-connector-list";
    payload.chargePoints.forEach((chargePoint) => {
      const row = document.createElement("div");
      row.className = "popup-connector";
      const heading = document.createElement("div");
      heading.className = "popup-connector-heading";
      const id = document.createElement("span");
      id.textContent = chargePoint.label || chargePoint.id;
      id.title = chargePoint.id;
      const state = connectorStatus(chargePoint.status);
      const status = document.createElement("strong");
      const statusClass = state.value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      status.className = `popup-connector-status is-${statusClass}`;
      status.textContent = state.label;
      heading.append(id, status);

      const descriptions = (chargePoint.plugs || []).map((plug) => {
        const parts = [plug.name || plug.type || "Connector"];
        if (plug.powerKw) parts.push(`${Math.round(plug.powerKw)} kW`);
        if (plug.cableAttached === true) parts.push("cable attached");
        return parts.join(" · ");
      });
      const meta = document.createElement("small");
      const updated = connectorAgeText(chargePoint.status, chargePoint.updatedAt);
      meta.textContent = [descriptions.join(" / "), updated].filter(Boolean).join(" · ");
      row.append(heading, meta);
      list.append(row);
    });
    container.className = "popup-details-content";
    container.append(list);
  }

  async function loadConnectorDetails(station, button, container) {
    const cached = connectorDetails.get(station.id);
    const cachedAt = cached?.generatedAt ? new Date(cached.generatedAt).getTime() : 0;
    if (cached && Date.now() - cachedAt < 60000) {
      renderConnectorDetails(container, cached);
      return;
    }
    button.disabled = true;
    button.textContent = "Loading connector details…";
    container.hidden = false;
    container.className = "popup-details-message";
    container.textContent = "Contacting EnBW…";
    try {
      const url = new URL(CHARGER_DETAIL_API_URL, window.location.href);
      url.searchParams.set("id", station.id);
      const response = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || `Charging service returned ${response.status}`);
      if (!Array.isArray(payload.chargePoints)) throw new Error("Invalid connector response");
      connectorDetails.set(station.id, payload);
      renderConnectorDetails(container, payload);
      button.textContent = "Hide connector details";
    } catch (error) {
      container.textContent = `Connector details unavailable: ${error.message}`;
      button.textContent = "Try connector details again";
    } finally {
      button.disabled = false;
      markers.get(station.id)?.getPopup()?.update();
    }
  }

  function createPopup(station) {
    const content = document.createElement("div");
    content.className = "charger-popup";
    const title = document.createElement("strong");
    title.className = "popup-title";
    title.textContent = station.address || "Public charging location";
    const status = document.createElement("div");
    status.className = "popup-availability";
    status.textContent = availabilityState(station).text;
    const context = document.createElement("div");
    context.className = "popup-context";
    context.textContent = [station.operator, formatDistance(station.distance)].filter(Boolean).join(" · ");
    const facts = document.createElement("div");
    facts.className = "popup-facts";
    stationFacts(station).forEach((fact) => {
      const chip = document.createElement("span");
      chip.textContent = fact;
      facts.append(chip);
    });
    const freshness = document.createElement("div");
    freshness.className = "popup-freshness";
    const age = relativeAgeText(station.lastSeenAt);
    freshness.textContent = age
      ? `${station.current === false ? "Last seen" : "Station data"} ${age.replace(/^updated /, "")}`
      : "Station update time unavailable";

    const actions = document.createElement("div");
    actions.className = "popup-actions";
    const favorite = document.createElement("button");
    favorite.className = "favorite-button popup-favorite-button";
    favorite.type = "button";
    setFavoriteButtonState(favorite, station);
    favorite.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleFavorite(station);
    });
    const directions = document.createElement("a");
    directions.className = "popup-directions";
    directions.href = `https://www.openstreetmap.org/?mlat=${station.position[0]}&mlon=${station.position[1]}#map=18/${station.position[0]}/${station.position[1]}`;
    directions.target = "_blank";
    directions.rel = "noreferrer";
    directions.textContent = "Directions ↗";
    actions.append(favorite, directions);

    const detailsButton = document.createElement("button");
    detailsButton.className = "popup-details-button";
    detailsButton.type = "button";
    detailsButton.setAttribute("aria-expanded", "false");
    detailsButton.textContent = "Show connector details";
    const details = document.createElement("div");
    details.className = "popup-details-content";
    details.hidden = true;
    details.setAttribute("aria-live", "polite");
    detailsButton.addEventListener("click", async (event) => {
      event.stopPropagation();
      const expanded = detailsButton.getAttribute("aria-expanded") === "true";
      if (expanded) {
        details.hidden = true;
        detailsButton.setAttribute("aria-expanded", "false");
        detailsButton.textContent = "Show connector details";
        return;
      }
      details.hidden = false;
      detailsButton.setAttribute("aria-expanded", "true");
      detailsButton.textContent = "Hide connector details";
      await loadConnectorDetails(station, detailsButton, details);
    });

    content.append(title, status, context);
    if (facts.childElementCount) content.append(facts);
    content.append(freshness, actions, detailsButton, details);
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
        title: markerTitle(station)
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
        total: Number(station.total) || 0,
        current: station.current !== false
      }));
    updateDataBadge();
    return payload;
  }

  async function searchPostcode(rawPostcode) {
    const input = byId("postcode");
    const postcode = normalisePostcode(rawPostcode);
    if (!/^\d{4}[A-Z]{2}$/.test(postcode)) {
      setSearchState("error", "Enter a Dutch postcode such as 1012 JS.");
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
      saveLastPostcode(formatted);
      activePostcode = formatted;
      byId("postcode-result").textContent = formatted;
      byId("map").setAttribute("aria-label", `Map showing public charging stations around postcode ${formatted}`);
      setSearchState("success", "");
      updateDataFreshnessLabels();
      startDataAgeClock();
      render();
    } catch (error) {
      if (error.message === "postcode-not-found") {
        setSearchState("error", "That postcode could not be found in the Dutch address register.");
      } else if (/limited to the European Netherlands/i.test(error.message)) {
        setSearchState("error", "This private deployment currently covers the European Netherlands.");
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

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) updateDataFreshnessLabels();
  });
  window.addEventListener("focus", updateDataFreshnessLabels);

  window.addEventListener("load", () => {
    const savedPostcode = loadLastPostcode();
    if (savedPostcode) byId("postcode").value = savedPostcode;
    initialiseMap();
    searchPostcode(byId("postcode").value);
  }, { once: true });
})();
