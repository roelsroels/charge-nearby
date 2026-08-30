(() => {
  "use strict";

  const centre = [52.37276, 4.89362];
  const stations = [
    { id: 1, name: "Nieuwezijds Voorburgwal", address: "Nieuwezijds Voorburgwal 147", position: [52.37366, 4.89061], distance: 230, available: 2, total: 2, power: "22 kW", operator: "TotalEnergies" },
    { id: 2, name: "Spuistraat", address: "Spuistraat 175", position: [52.37175, 4.88918], distance: 360, available: 1, total: 2, power: "22 kW", operator: "Equans" },
    { id: 3, name: "Oudezijds Voorburgwal", address: "Oudezijds Voorburgwal 197", position: [52.37132, 4.89764], distance: 410, available: 3, total: 4, power: "11 kW", operator: "TotalEnergies" },
    { id: 4, name: "Singel", address: "Singel 240", position: [52.37067, 4.88858], distance: 490, available: 1, total: 2, power: "22 kW", operator: "Vattenfall" },
    { id: 5, name: "Geldersekade", address: "Geldersekade 30", position: [52.37539, 4.90055], distance: 620, available: 2, total: 4, power: "22 kW", operator: "Equans" },
    { id: 6, name: "Waterlooplein", address: "Waterlooplein 22", position: [52.36844, 4.90152], distance: 810, available: 1, total: 2, power: "50 kW", operator: "Shell Recharge" },
    { id: 7, name: "Westerstraat", address: "Westerstraat 52", position: [52.37924, 4.88432], distance: 1120, available: 1, total: 2, power: "11 kW", operator: "TotalEnergies" },
    { id: 8, name: "Kattenburgerstraat", address: "Kattenburgerstraat 5", position: [52.37183, 4.91509], distance: 1560, available: 0, total: 4, power: "22 kW", operator: "Equans" }
  ];

  let map;
  let stationLayer;
  let radiusLayer;
  let activeRadius = 500;
  const markers = new Map();

  const byId = (id) => document.getElementById(id);
  const formatDistance = (metres) => metres < 1000 ? `${metres} m` : `${(metres / 1000).toFixed(1)} km`;

  function stationCard(station) {
    const article = document.createElement("article");
    article.className = "station-card";
    article.tabIndex = 0;
    article.dataset.stationId = String(station.id);
    const availabilityClass = station.available <= 1 ? " limited" : "";
    article.innerHTML = `
      <div class="station-card-top">
        <span class="distance">${formatDistance(station.distance)} AWAY</span>
        <span class="availability${availabilityClass}">${station.available} of ${station.total} available</span>
      </div>
      <div>
        <h3>${station.name}</h3>
        <p class="station-address">${station.address}, Amsterdam</p>
      </div>
      <div class="station-meta">
        <div class="station-meta-list"><span>⚡ ${station.power}</span><span>${station.operator}</span></div>
        <a class="directions-link" href="https://www.openstreetmap.org/?mlat=${station.position[0]}&mlon=${station.position[1]}#map=18/${station.position[0]}/${station.position[1]}" target="_blank" rel="noreferrer">Directions ↗</a>
      </div>`;
    article.addEventListener("mouseenter", () => highlightStation(station.id));
    article.addEventListener("focus", () => highlightStation(station.id));
    article.addEventListener("mouseleave", clearHighlights);
    article.addEventListener("blur", clearHighlights);
    return article;
  }

  function highlightStation(id) {
    document.querySelectorAll(".station-card").forEach((card) => card.classList.toggle("is-highlighted", Number(card.dataset.stationId) === id));
    const marker = markers.get(id);
    if (marker && map) marker.openPopup();
  }

  function clearHighlights() {
    document.querySelectorAll(".station-card").forEach((card) => card.classList.remove("is-highlighted"));
  }

  function pinIcon(station) {
    const busy = station.available === 0 ? " busy" : "";
    return L.divIcon({ className: `charger-pin${busy}`, html: `<span>${station.available}/${station.total}</span>` });
  }

  function visibleStations() {
    return stations.filter((station) => station.distance <= activeRadius);
  }

  function render() {
    const visible = visibleStations();
    const available = visible.reduce((sum, station) => sum + station.available, 0);
    const list = byId("station-list");
    list.replaceChildren();
    if (visible.length) visible.forEach((station) => list.append(stationCard(station)));
    else list.innerHTML = `<div class="empty-state"><h3>No available chargers this close</h3><p>Try increasing the search radius.</p></div>`;

    byId("available-count").textContent = String(available);
    byId("location-count").textContent = String(visible.length);
    byId("radius-summary").textContent = activeRadius < 1000 ? `${activeRadius} m` : `${activeRadius / 1000} km`;

    if (map) {
      stationLayer.clearLayers();
      markers.clear();
      visible.forEach((station) => {
        const marker = L.marker(station.position, { icon: pinIcon(station), title: `${station.name}: ${station.available} available` })
          .bindPopup(`<strong>${station.name}</strong><br>${station.available} of ${station.total} available`)
          .addTo(stationLayer);
        markers.set(station.id, marker);
      });
      if (radiusLayer) radiusLayer.remove();
      radiusLayer = L.circle(centre, { radius: activeRadius, className: "radius-circle" }).addTo(map);
      map.fitBounds(radiusLayer.getBounds(), { padding: [42, 42], animate: false });
    }
  }

  function initialiseMap() {
    render();
    if (!window.L) {
      document.querySelector(".map-panel").classList.add("map-unavailable");
      byId("map").innerHTML = "<p>Map tiles could not be loaded. The station list is still available below.</p>";
      return;
    }
    map = L.map("map", { zoomControl: true, scrollWheelZoom: false, attributionControl: true }).setView(centre, 15);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors"
    }).addTo(map);
    stationLayer = L.layerGroup().addTo(map);
    L.marker(centre, { icon: L.divIcon({ className: "search-centre" }), title: "Search centre" }).addTo(map);
    render();
  }

  document.querySelectorAll('input[name="radius"]').forEach((input) => {
    input.addEventListener("change", () => {
      activeRadius = Number(input.value);
      render();
    });
  });

  byId("charger-search").addEventListener("submit", (event) => {
    event.preventDefault();
    const input = byId("postcode");
    const value = input.value.toUpperCase().replace(/\s+/g, "");
    const valid = /^\d{4}[A-Z]{2}$/.test(value);
    if (!valid) {
      input.setAttribute("aria-invalid", "true");
      byId("postcode-help").textContent = "Enter a Dutch postcode such as 1012 JS.";
      input.focus();
      return;
    }
    input.removeAttribute("aria-invalid");
    const formatted = `${value.slice(0, 4)} ${value.slice(4)}`;
    input.value = formatted;
    byId("postcode-result").textContent = formatted;
    byId("postcode-help").textContent = "Showing realistic demo results around this postcode.";
    render();
    byId("results-title").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.querySelector(".map-list-toggle").addEventListener("click", (event) => {
    const button = event.currentTarget;
    const pressed = button.getAttribute("aria-pressed") === "true";
    button.setAttribute("aria-pressed", String(!pressed));
    document.querySelector(".toggle-text").textContent = pressed ? "Show list" : "Back to map";
    (pressed ? document.querySelector(".map-panel") : byId("results")).scrollIntoView({ behavior: "smooth", block: "start" });
  });

  window.addEventListener("load", initialiseMap, { once: true });
})();
