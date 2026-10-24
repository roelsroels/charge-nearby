(() => {
  "use strict";

  const DEFAULT_CENTRE = [52.37276, 4.89362];
  const PDOK_SEARCH_URL = "https://api.pdok.nl/kadaster/location-api/v1/search";
  const CHARGER_API_URL = "api/chargers";
  const CHARGER_DETAIL_API_URL = "api/charger-details";
  const FAVORITES_STORAGE_KEY = "charge-nearby:favorites:v1";
  const CONNECTOR_FAVORITES_STORAGE_KEY = "charge-nearby:connector-favorites:v1";
  const LAST_POSTCODE_STORAGE_KEY = "charge-nearby:last-postcode:v1";
  const LANGUAGE_STORAGE_KEY = "charge-nearby:language:v1";

  const translations = {
    en: {
      pageTitle: "Charge Nearby · public charging around you",
      metaDescription: "Find available public EV charging stations near a Dutch postcode.",
      skipResults: "Skip to results", brandHome: "Charge Nearby home", connectingEnbw: "Connecting to EnBW…",
      reloadPage: "Reload page", languageSelector: "Interface language", heroTitle: "Available charger,", heroAccent: "closeby",
      introCopy: "Enter a NL postcode and see which public charging points are available right now—sorted by distance.",
      finderLabel: "Charging station finder", searchTitle: "Where should we look?", searchDescription: "Use a full postcode for a more precise centre point.",
      postcode: "Postcode", findChargers: "Find chargers", findingChargers: "Finding chargers…", loadingInitial: "Loading public postcode and charging data…",
      searchRadius: "Search radius", chargerFilters: "Charger filters", connector: "Connector", allConnectors: "All connectors",
      acCharging: "AC charging", dcFastCharging: "DC fast charging", chargingSpeed: "Charging speed", anySpeed: "Any speed", speedAtLeast: "{value} kW or faster",
      availabilityLegend: "Availability legend", available: "Available", availableLower: "available", occupied: "Occupied", unknown: "Unknown", noCurrentData: "No current data",
      chargerTypeLegend: "Map charger type legend", regular: "Regular", fast: "Fast", within: "Within", longestConnected: "Longest connected",
      showList: "Show list", backToMap: "Back to map", nearestFirst: "NEAREST FIRST", availableAround: "Available around",
      favoritesHelp: "Available favorite connectors appear first, followed by favorite stations. Open connector details to save an individual connector.",
      locationsFound: "locations found", aboutData: "ABOUT THE DATA", dataTitle: "Live enough to be useful.<br>Honest enough to say when it isn’t.",
      dataCopy: "Postcodes are located through the public PDOK address register. Charger locations and connector availability are requested from EnBW mobility+ through this private server and briefly cached. Previously seen locations remain visible in gray when EnBW provides no current data. Availability is the roaming-network status—not a guarantee that a parking bay is accessible.",
      selectedCircle: "SELECTED SEARCH CIRCLE", closeLongest: "Close longest connected overview",
      connectedNote: "Ranked by the time since EnBW recorded each connector as occupied. This indicates approximate plug-in time, not whether power is flowing.",
      footerTagline: "Public charging across the Netherlands, searched by postcode.", footerSources: "Postcodes: PDOK · Chargers: EnBW mobility+ · Map © OpenStreetMap contributors ·", release: "Release",
      updatedNow: "updated just now", updatedMinutes: "updated {count} {unit} ago", updatedHours: "updated {count} {unit} ago", updatedDays: "updated {count} {unit} ago",
      minute: "minute", minutes: "minutes", hour: "hour", hours: "hours", day: "day", days: "days", updateUnavailable: "update time unavailable",
      centeredData: "Centred on {postcode} · EnBW charging data {age}{cache}.", cachedData: " · showing cached data",
      statusUnknown: "Status unknown", allOccupied: "All {count} occupied", availableOf: "{available} of {total} available",
      away: "{distance} AWAY", publicLocation: "Public charging location", operatorUnknown: "Operator not supplied", upToPower: "⚡ up to {power} kW", powerUnknown: "Power unknown",
      directions: "Directions ↗", showDetails: "Show connector details", hideDetails: "Hide connector details", loadingDetails: "Loading connector details…", retryDetails: "Try connector details again",
      add: "Add", remove: "Remove", favorites: "favorites", favorite: "♥ Favorite", addFavorite: "♡ Add favorite", favoriteStation: "Favorite station", favoriteConnector: "Favorite connector available",
      favoriteConnectors: "♥ {count} favorite connectors available", favoriteConnectorOne: "♥ Favorite connector available",
      favoriteStationAria: "{action} {location} {preposition} favorites", from: "from", to: "to",
      favoriteConnectorAria: "{action} connector {label} {preposition} favorites", removeConnectorFavorite: "Remove connector favorite", addConnectorFavorite: "Favorite this connector",
      highPowerDescription: "DC high-power charging", fastDescription: "DC fast charging", acDescription: "AC charging", connectorUnknown: "Connector type unknown",
      openAlways: "Open 24/7", paymentSupported: "Payment supported", accessible: "Accessible", unknownStatuses: "{count} {unit} unknown", status: "status", statuses: "statuses",
      outOfService: "Out of service", reserved: "Reserved", connectedUnderMinute: "connected <1 minute", connectedApprox: "connected ~{age}", durationUnknown: "duration unknown",
      noConnectorInfo: "No individual connector information was supplied.", genericConnector: "Connector", cableAttached: "cable attached", contactingEnbw: "Contacting EnBW…",
      detailsUnavailable: "Connector details unavailable: {error}", serviceError: "Charging service returned {status}", invalidConnectorResponse: "Invalid connector response",
      noOccupiedMatches: "No occupied connectors matching these filters have a usable status timestamp.", unavailableCount: " · {count} unavailable",
      connectedSummary: "{count} matching connectors across {locations} scanned locations{failures} · longest first", showOnMap: "Show this station on the map",
      scanningCircle: "Scanning connector status in the selected {radius} circle…", overviewError: "Could not build the overview: {error}",
      stationData: "Station data", lastSeen: "Last seen", stationUpdateUnavailable: "Station update time unavailable",
      noFilterMatchesTitle: "No chargers match these filters", noFilterMatchesCopy: "Try another connector, charging speed, or radius.",
      noNearbyTitle: "No public chargers found this close", noNearbyCopy: "Try increasing the search radius.",
      postcodeInvalid: "Enter a Dutch postcode such as 1012 JS.", postcodeLookup: "Looking up the postcode…", availabilityLookup: "Resolving current EnBW charging availability…",
      postcodeNotFound: "That postcode could not be found in the Dutch address register.", coverageError: "This private deployment currently covers the European Netherlands.",
      denseArea: "This area is too dense for that radius. Try a smaller search radius.", chargingUnavailable: "Charging data is temporarily unavailable: {error}", invalidChargingResponse: "Invalid charging response",
      apiKeyRejected: "The EnBW API key was rejected", apiKeyMissing: "The EnBW API key is not configured", capacityBusy: "The charging service is busy; try again shortly",
      upstreamUnavailable: "Could not reach the EnBW charging service", stationDetailsUnavailable: "Station details are unavailable", stationSearchFirst: "Search for this station before requesting details", postcodeServiceError: "PDOK returned status {status}",
      mapLabel: "Map showing public charging stations around postcode {postcode}", mapUnavailable: "Map tiles could not be loaded. The station list is still available below.", postcodeCentre: "Postcode centre"
    },
    nl: {
      pageTitle: "Charge Nearby · openbare laadpunten in de buurt",
      metaDescription: "Vind beschikbare openbare laadpunten in de buurt van een Nederlandse postcode.",
      skipResults: "Ga naar de resultaten", brandHome: "Charge Nearby startpagina", connectingEnbw: "Verbinden met EnBW…",
      reloadPage: "Pagina opnieuw laden", languageSelector: "Taal van de website", heroTitle: "Beschikbare laadpaal,", heroAccent: "dichtbij",
      introCopy: "Vul een Nederlandse postcode in en bekijk welke openbare laadpunten nu beschikbaar zijn—gesorteerd op afstand.",
      finderLabel: "Zoeker voor laadpunten", searchTitle: "Waar zullen we zoeken?", searchDescription: "Gebruik een volledige postcode voor een nauwkeuriger middelpunt.",
      postcode: "Postcode", findChargers: "Zoek laadpunten", findingChargers: "Laadpunten zoeken…", loadingInitial: "Openbare postcode- en laadgegevens laden…",
      searchRadius: "Zoekstraal", chargerFilters: "Laadfilters", connector: "Aansluiting", allConnectors: "Alle aansluitingen",
      acCharging: "AC-laden", dcFastCharging: "DC-snelladen", chargingSpeed: "Laadsnelheid", anySpeed: "Elke snelheid", speedAtLeast: "{value} kW of sneller",
      availabilityLegend: "Legenda beschikbaarheid", available: "Beschikbaar", availableLower: "beschikbaar", occupied: "Bezet", unknown: "Onbekend", noCurrentData: "Geen actuele data",
      chargerTypeLegend: "Legenda type laadpunt", regular: "Regulier", fast: "Snel", within: "Binnen", longestConnected: "Langst aangesloten",
      showList: "Toon lijst", backToMap: "Terug naar kaart", nearestFirst: "DICHTSTBIJ EERST", availableAround: "Beschikbaar rond",
      favoritesHelp: "Beschikbare favoriete aansluitingen staan eerst, gevolgd door favoriete laadpunten. Open de aansluitdetails om een aansluiting als favoriet op te slaan.",
      locationsFound: "locaties gevonden", aboutData: "OVER DE DATA", dataTitle: "Actueel genoeg om nuttig te zijn.<br>Eerlijk genoeg om onzekerheid te tonen.",
      dataCopy: "Postcodes worden gevonden via het openbare PDOK-adresregister. Laadlocaties en beschikbaarheid van aansluitingen worden via deze privéserver opgevraagd bij EnBW mobility+ en kort opgeslagen. Eerder waargenomen locaties blijven grijs zichtbaar wanneer EnBW geen actuele data levert. Beschikbaarheid is de status van het roamingnetwerk—geen garantie dat een parkeerplaats toegankelijk is.",
      selectedCircle: "GESELECTEERDE ZOEKCIRKEL", closeLongest: "Overzicht langst aangesloten sluiten",
      connectedNote: "Gerangschikt op de tijd sinds EnBW elke aansluiting als bezet registreerde. Dit is een benadering van de aangesloten tijd, niet van de actieve stroomafname.",
      footerTagline: "Openbaar laden in heel Nederland, gezocht op postcode.", footerSources: "Postcodes: PDOK · Laadpunten: EnBW mobility+ · Kaart © OpenStreetMap-bijdragers ·", release: "Versie",
      updatedNow: "zojuist bijgewerkt", updatedMinutes: "{count} {unit} geleden bijgewerkt", updatedHours: "{count} {unit} geleden bijgewerkt", updatedDays: "{count} {unit} geleden bijgewerkt",
      minute: "minuut", minutes: "minuten", hour: "uur", hours: "uur", day: "dag", days: "dagen", updateUnavailable: "tijdstip update onbekend",
      centeredData: "Gecentreerd op {postcode} · EnBW-laadgegevens {age}{cache}.", cachedData: " · opgeslagen data wordt getoond",
      statusUnknown: "Status onbekend", allOccupied: "Alle {count} bezet", availableOf: "{available} van {total} beschikbaar",
      away: "{distance} AFSTAND", publicLocation: "Openbare laadlocatie", operatorUnknown: "Aanbieder niet vermeld", upToPower: "⚡ tot {power} kW", powerUnknown: "Vermogen onbekend",
      directions: "Route ↗", showDetails: "Toon aansluitdetails", hideDetails: "Verberg aansluitdetails", loadingDetails: "Aansluitdetails laden…", retryDetails: "Aansluitdetails opnieuw proberen",
      add: "Voeg", remove: "Verwijder", favorites: "favorieten", favorite: "♥ Favoriet", addFavorite: "♡ Maak favoriet", favoriteStation: "Favoriet laadpunt", favoriteConnector: "Favoriete aansluiting beschikbaar",
      favoriteConnectors: "♥ {count} favoriete aansluitingen beschikbaar", favoriteConnectorOne: "♥ Favoriete aansluiting beschikbaar",
      favoriteStationAria: "{action} {location} {preposition} favorieten", from: "uit", to: "toe aan",
      favoriteConnectorAria: "{action} aansluiting {label} {preposition} favorieten", removeConnectorFavorite: "Favoriete aansluiting verwijderen", addConnectorFavorite: "Maak deze aansluiting favoriet",
      highPowerDescription: "DC-laden met hoog vermogen", fastDescription: "DC-snelladen", acDescription: "AC-laden", connectorUnknown: "Type aansluiting onbekend",
      openAlways: "24/7 geopend", paymentSupported: "Betalen mogelijk", accessible: "Toegankelijk", unknownStatuses: "{count} {unit} onbekend", status: "status", statuses: "statussen",
      outOfService: "Buiten gebruik", reserved: "Gereserveerd", connectedUnderMinute: "<1 minuut aangesloten", connectedApprox: "~{age} aangesloten", durationUnknown: "duur onbekend",
      noConnectorInfo: "Er is geen informatie over individuele aansluitingen aangeleverd.", genericConnector: "Aansluiting", cableAttached: "kabel aanwezig", contactingEnbw: "Contact maken met EnBW…",
      detailsUnavailable: "Aansluitdetails niet beschikbaar: {error}", serviceError: "Laadservice gaf status {status}", invalidConnectorResponse: "Ongeldig antwoord met aansluitingen",
      noOccupiedMatches: "Geen bezette aansluitingen met deze filters hebben een bruikbaar statustijdstip.", unavailableCount: " · {count} niet beschikbaar",
      connectedSummary: "{count} overeenkomende aansluitingen op {locations} gecontroleerde locaties{failures} · langste eerst", showOnMap: "Toon dit laadpunt op de kaart",
      scanningCircle: "Aansluitstatus binnen de geselecteerde cirkel van {radius} scannen…", overviewError: "Kon het overzicht niet maken: {error}",
      stationData: "Laadpuntdata", lastSeen: "Laatst gezien", stationUpdateUnavailable: "Tijdstip update laadpunt onbekend",
      noFilterMatchesTitle: "Geen laadpunten passen bij deze filters", noFilterMatchesCopy: "Probeer een andere aansluiting, laadsnelheid of zoekstraal.",
      noNearbyTitle: "Geen openbare laadpunten zo dichtbij gevonden", noNearbyCopy: "Probeer een grotere zoekstraal.",
      postcodeInvalid: "Vul een Nederlandse postcode in, bijvoorbeeld 1012 JS.", postcodeLookup: "Postcode opzoeken…", availabilityLookup: "Actuele beschikbaarheid bij EnBW opvragen…",
      postcodeNotFound: "Deze postcode is niet gevonden in het Nederlandse adresregister.", coverageError: "Deze privé-installatie dekt momenteel Europees Nederland.",
      denseArea: "Dit gebied bevat te veel laadpunten voor deze straal. Kies een kleinere zoekstraal.", chargingUnavailable: "Laadgegevens zijn tijdelijk niet beschikbaar: {error}", invalidChargingResponse: "Ongeldig antwoord met laadgegevens",
      apiKeyRejected: "De EnBW-API-sleutel is geweigerd", apiKeyMissing: "De EnBW-API-sleutel is niet ingesteld", capacityBusy: "De laadservice is bezet; probeer het zo opnieuw",
      upstreamUnavailable: "De EnBW-laadservice is niet bereikbaar", stationDetailsUnavailable: "Details van dit laadpunt zijn niet beschikbaar", stationSearchFirst: "Zoek eerst naar dit laadpunt voordat je details opvraagt", postcodeServiceError: "PDOK gaf status {status}",
      mapLabel: "Kaart met openbare laadpunten rond postcode {postcode}", mapUnavailable: "Kaarttegels konden niet worden geladen. De lijst met laadpunten is hieronder nog beschikbaar.", postcodeCentre: "Middelpunt postcode"
    }
  };

  let map;
  let stationLayer;
  let radiusLayer;
  let centreMarker;
  let searchCentre = DEFAULT_CENTRE;
  let activeRadius = Number(document.querySelector('input[name="radius"]:checked')?.value) || 250;
  let activeConnectorFilter = document.getElementById("connector-filter")?.value || "all";
  let activeMinPower = Number(document.getElementById("speed-filter")?.value) || 0;
  let stations = [];
  let dataMeta = null;
  let activePostcode = null;
  let dataAgeTimer = null;
  let searchRequestId = 0;
  let currentLanguage = loadLanguage();
  let currentSearchMessage = { key: "loadingInitial", params: {} };
  const markers = new Map();
  const connectorDetails = new Map();
  const connectorDetailRequests = new Map();
  const favorites = loadFavoriteIds();
  const connectorFavorites = loadConnectorFavorites();

  const byId = (id) => document.getElementById(id);
  const formatDistance = (metres) => metres < 1000 ? `${Math.round(metres)} m` : `${(metres / 1000).toFixed(1)} km`;

  function loadLanguage() {
    try {
      return localStorage.getItem(LANGUAGE_STORAGE_KEY) === "nl" ? "nl" : "en";
    } catch {
      return "en";
    }
  }

  function t(key, params = {}) {
    const template = translations[currentLanguage]?.[key] ?? translations.en[key] ?? key;
    return Object.entries(params).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), template);
  }

  function localizedError(message) {
    const value = String(message || "");
    if (/API key was rejected/i.test(value)) return t("apiKeyRejected");
    if (/ENBW_API_KEY is not configured/i.test(value)) return t("apiKeyMissing");
    if (/capacity is temporarily busy/i.test(value)) return t("capacityBusy");
    if (/Could not reach the EnBW charging service/i.test(value)) return t("upstreamUnavailable");
    if (/Station details are unavailable/i.test(value)) return t("stationDetailsUnavailable");
    if (/Search for this station before requesting details/i.test(value)) return t("stationSearchFirst");
    if (/too many grouped stations|smaller radius|contains \d+ stations/i.test(value)) return t("denseArea");
    return value;
  }

  function translateDocument() {
    document.documentElement.lang = currentLanguage;
    document.title = t("pageTitle");
    document.querySelector('meta[name="description"]')?.setAttribute("content", t("metaDescription"));
    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const params = element.dataset.i18nValue ? { value: element.dataset.i18nValue } : {};
      element.textContent = t(element.dataset.i18n, params);
    });
    document.querySelectorAll("[data-i18n-html]").forEach((element) => {
      element.innerHTML = t(element.dataset.i18nHtml);
    });
    document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
      element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel));
    });
    document.querySelectorAll("[data-i18n-title]").forEach((element) => {
      element.title = t(element.dataset.i18nTitle);
    });
    document.querySelectorAll(".language-switch button").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.language === currentLanguage));
    });
  }

  function setLanguage(language) {
    if (!translations[language] || language === currentLanguage) return;
    currentLanguage = language;
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      // The language still applies for this page view when storage is unavailable.
    }
    translateDocument();
    const help = byId("postcode-help");
    if (help.dataset.state === "success") updateDataFreshnessLabels();
    else help.textContent = t(currentSearchMessage.key, currentSearchMessage.params);
    if (map) {
      const postcode = activePostcode || formatPostcode(byId("postcode").value);
      byId("map").setAttribute("aria-label", t("mapLabel", { postcode }));
      if (centreMarker) centreMarker.options.title = t("postcodeCentre");
      centreMarker?.getElement()?.setAttribute("title", t("postcodeCentre"));
      const listToggle = document.querySelector(".map-list-toggle");
      document.querySelector(".toggle-text").textContent = t(listToggle.getAttribute("aria-pressed") === "true" ? "backToMap" : "showList");
      render();
    }
  }

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

  function loadConnectorFavorites() {
    try {
      const stored = JSON.parse(localStorage.getItem(CONNECTOR_FAVORITES_STORAGE_KEY) || "[]");
      if (!Array.isArray(stored)) return new Map();
      return new Map(stored
        .filter((item) => item && typeof item.id === "string" && typeof item.stationId === "string")
        .map((item) => [connectorFavoriteKey(item.stationId, item.id), {
          id: item.id,
          stationId: item.stationId,
          label: typeof item.label === "string" ? item.label : item.id
        }]));
    } catch {
      return new Map();
    }
  }

  function connectorFavoriteKey(stationId, connectorId) {
    return `${stationId}::${connectorId}`;
  }

  function saveConnectorFavorites() {
    try {
      localStorage.setItem(CONNECTOR_FAVORITES_STORAGE_KEY, JSON.stringify([...connectorFavorites.values()]));
    } catch {
      // Connector favorites still work for this page view when storage is unavailable.
    }
  }

  function migrateSupersededFavoriteIds(nextStations) {
    let stationFavoritesChanged = false;
    let connectorFavoritesChanged = false;
    nextStations.forEach((station) => {
      const supersededIds = Array.isArray(station.supersededIds)
        ? station.supersededIds.filter((id) => typeof id === "string" && id !== station.id)
        : [];
      supersededIds.forEach((oldStationId) => {
        if (favorites.delete(oldStationId)) {
          favorites.add(station.id);
          stationFavoritesChanged = true;
        }
        [...connectorFavorites].forEach(([key, favorite]) => {
          if (favorite.stationId !== oldStationId) return;
          connectorFavorites.delete(key);
          const migrated = { ...favorite, stationId: station.id };
          connectorFavorites.set(connectorFavoriteKey(station.id, migrated.id), migrated);
          connectorFavoritesChanged = true;
        });
      });
    });
    if (stationFavoritesChanged) saveFavoriteIds();
    if (connectorFavoritesChanged) saveConnectorFavorites();
  }

  function favoriteConnectorState(station) {
    const favoriteIds = new Set([...connectorFavorites.values()]
      .filter((item) => item.stationId === station.id)
      .map((item) => item.id));
    if (!favoriteIds.size) return { total: 0, available: 0, loaded: false };
    const payload = connectorDetails.get(station.id);
    if (!payload?.chargePoints) return { total: favoriteIds.size, available: 0, loaded: false };
    const favoritePoints = payload.chargePoints.filter((chargePoint) => favoriteIds.has(chargePoint.id));
    return {
      total: favoriteIds.size,
      available: favoritePoints.filter((chargePoint) => String(chargePoint.status).toUpperCase() === "AVAILABLE").length,
      loaded: true
    };
  }

  function favoriteConnectorAlert(station, variant) {
    const alert = document.createElement("div");
    alert.className = `favorite-connector-alert${variant === "popup" ? " is-popup" : ""}`;
    alert.dataset.favoriteConnectorStation = station.id;
    alert.setAttribute("role", "status");
    updateFavoriteConnectorAlert(alert, station);
    return alert;
  }

  function updateFavoriteConnectorAlert(alert, station) {
    const state = favoriteConnectorState(station);
    alert.hidden = state.available === 0;
    alert.textContent = state.available === 1
      ? t("favoriteConnectorOne")
      : t("favoriteConnectors", { count: state.available });
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
    if (ageSeconds < 60) return t("updatedNow");
    const minutes = Math.floor(ageSeconds / 60);
    if (minutes < 60) return t("updatedMinutes", { count: minutes, unit: t(minutes === 1 ? "minute" : "minutes") });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t("updatedHours", { count: hours, unit: t(hours === 1 ? "hour" : "hours") });
    const days = Math.floor(hours / 24);
    return t("updatedDays", { count: days, unit: t(days === 1 ? "day" : "days") });
  }

  function elapsedAgeText(timestamp) {
    const parsed = new Date(timestamp).getTime();
    if (!Number.isFinite(parsed)) return null;
    const ageSeconds = Math.max(0, Math.floor((Date.now() - parsed) / 1000));
    if (ageSeconds < 60) return null;
    const minutes = Math.floor(ageSeconds / 60);
    if (minutes < 60) return `${minutes} ${t(minutes === 1 ? "minute" : "minutes")}`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ${t(hours === 1 ? "hour" : "hours")}`;
    const days = Math.floor(hours / 24);
    return `${days} ${t(days === 1 ? "day" : "days")}`;
  }

  function dataAgeText() {
    return relativeAgeText(dataMeta?.generatedAt) || t("updateUnavailable");
  }

  function updateDataBadge() {
    const badge = document.querySelector(".live-pill");
    const ageMinutes = dataMeta?.generatedAt
      ? (Date.now() - new Date(dataMeta.generatedAt).getTime()) / 60000
      : Infinity;
    badge.dataset.state = dataMeta?.cache === "stale" || ageMinutes > 15 ? "stale" : "current";
    const label = badge.querySelector("span");
    if (label) label.textContent = `EnBW · ${dataAgeText()}`;
  }

  function updateDataFreshnessLabels() {
    if (!dataMeta?.generatedAt) return;
    updateDataBadge();
    const help = byId("postcode-help");
    if (!activePostcode || help.dataset.state !== "success") return;
    const cacheNote = dataMeta?.cache === "stale" ? t("cachedData") : "";
    help.textContent = t("centeredData", { postcode: activePostcode, age: dataAgeText(), cache: cacheNote });
  }

  function startDataAgeClock() {
    if (dataAgeTimer === null) dataAgeTimer = window.setInterval(updateDataFreshnessLabels, 10000);
  }

  function availabilityState(station) {
    if (station.current === false) return { className: " unavailable", text: t("noCurrentData") };
    if (!station.known || !station.total) return { className: " unknown", text: t("statusUnknown") };
    if (station.available === 0) return { className: " busy", text: t("allOccupied", { count: station.total }) };
    return {
      className: station.available === 1 ? " limited" : "",
      text: t("availableOf", { available: station.available, total: station.total })
    };
  }

  function stationCard(station) {
    const favoriteConnector = favoriteConnectorState(station);
    const article = document.createElement("article");
    article.className = `station-card${favorites.has(station.id) ? " is-favorite" : ""}${favoriteConnector.available ? " has-available-favorite-connector" : ""}${station.current === false ? " is-unavailable" : ""}`;
    article.tabIndex = 0;
    article.dataset.stationId = station.id;

    const top = document.createElement("div");
    top.className = "station-card-top";
    const distance = document.createElement("span");
    distance.className = "distance";
    distance.textContent = t("away", { distance: formatDistance(station.distance) });
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
    title.textContent = station.address || t("publicLocation");
    const subtitle = document.createElement("p");
    subtitle.className = "station-address";
    subtitle.textContent = station.operator || t("operatorUnknown");
    body.append(title, subtitle);

    const footer = document.createElement("div");
    footer.className = "station-meta";
    const facts = document.createElement("div");
    facts.className = "station-meta-list";
    const power = document.createElement("span");
    power.textContent = station.powerKw ? t("upToPower", { power: Math.round(station.powerKw) }) : t("powerUnknown");
    const connector = document.createElement("span");
    if (station.connectors?.includes("TYPE_2")) connector.textContent = "Type 2";
    else if (station.connectors?.some((type) => type.includes("CCS"))) connector.textContent = "CCS";
    else connector.textContent = station.connectorNames?.[0] || "EVSE";
    facts.append(power, connector);
    const directions = document.createElement("a");
    directions.className = "directions-link";
    directions.href = `https://www.openstreetmap.org/?mlat=${station.position[0]}&mlon=${station.position[1]}#map=18/${station.position[0]}/${station.position[1]}`;
    directions.target = "_blank";
    directions.rel = "noreferrer";
    directions.textContent = t("directions");
    footer.append(facts, directions);

    const detailsButton = document.createElement("button");
    detailsButton.className = "card-details-button";
    detailsButton.type = "button";
    detailsButton.setAttribute("aria-expanded", "false");
    detailsButton.textContent = t("showDetails");
    const details = document.createElement("div");
    details.className = "popup-details-content card-details-content";
    details.dataset.variant = "card";
    details.hidden = true;
    details.setAttribute("aria-live", "polite");
    detailsButton.addEventListener("click", async (event) => {
      event.stopPropagation();
      const expanded = detailsButton.getAttribute("aria-expanded") === "true";
      if (expanded) {
        details.hidden = true;
        detailsButton.setAttribute("aria-expanded", "false");
        detailsButton.textContent = t("showDetails");
        return;
      }
      details.hidden = false;
      detailsButton.setAttribute("aria-expanded", "true");
      detailsButton.textContent = t("hideDetails");
      await loadConnectorDetails(station, detailsButton, details);
    });

    article.append(top, favoriteConnectorAlert(station, "card"), body, footer, detailsButton, details);
    article.addEventListener("mouseenter", () => highlightStation(station.id));
    article.addEventListener("focus", () => highlightStation(station.id));
    article.addEventListener("mouseleave", clearHighlights);
    article.addEventListener("blur", clearHighlights);
    return article;
  }

  function setFavoriteButtonState(button, station) {
    const selected = favorites.has(station.id);
    const action = t(selected ? "remove" : "add");
    button.dataset.favoriteStationId = station.id;
    button.setAttribute("aria-pressed", String(selected));
    button.setAttribute("aria-label", t("favoriteStationAria", { action, location: station.address || t("publicLocation"), preposition: t(selected ? "from" : "to") }));
    button.title = t("favoriteStationAria", { action, location: "", preposition: t(selected ? "from" : "to") }).replace(/\s+/g, " ").trim();
    button.textContent = button.classList.contains("popup-favorite-button")
      ? t(selected ? "favorite" : "addFavorite")
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

  function refreshFavoriteConnectorPresentation(station) {
    const state = favoriteConnectorState(station);
    document.querySelectorAll(".station-card").forEach((card) => {
      if (card.dataset.stationId === station.id) {
        card.classList.toggle("has-available-favorite-connector", state.available > 0);
      }
    });
    document.querySelectorAll("[data-favorite-connector-station]").forEach((alert) => {
      if (alert.dataset.favoriteConnectorStation === station.id) updateFavoriteConnectorAlert(alert, station);
    });
    document.querySelectorAll(".popup-details-content, .card-details-content").forEach((container) => {
      if (container.dataset.stationId === station.id && connectorDetails.has(station.id)) {
        renderConnectorDetails(container, connectorDetails.get(station.id), station);
      }
    });
    sortStationCards();
    const marker = markers.get(station.id);
    if (marker) {
      marker.setIcon(pinIcon(station));
      marker.options.title = markerTitle(station);
      marker.getElement()?.setAttribute("title", marker.options.title);
      const popupAlert = marker.getPopup()?.getContent()?.querySelector?.("[data-favorite-connector-station]");
      if (popupAlert) updateFavoriteConnectorAlert(popupAlert, station);
    }
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
    const favoriteConnectorAvailable = favoriteConnectorState(station).available > 0 ? " connector-favorite-available" : "";
    const profile = chargingProfile(station);
    const label = station.known && station.total ? `${station.available}/${station.total}` : "?";
    const favoriteBadge = favorite ? '<i aria-hidden="true">♥</i>' : "";
    const connectorFavoriteBadge = favoriteConnectorAvailable ? '<em aria-hidden="true">♥</em>' : "";
    const profileBadge = `<b aria-hidden="true">${profile.label}</b>`;
    return L.divIcon({ className: `charger-pin${state}${favorite}${favoriteConnectorAvailable} speed-${profile.kind}`, html: `<span>${label}</span>${favoriteBadge}${connectorFavoriteBadge}${profileBadge}` });
  }

  function connectorText(values) {
    return (values || []).filter(Boolean).map((value) => String(value).toUpperCase()).join(" ");
  }

  function matchesConnector(values, filter = activeConnectorFilter) {
    if (filter === "all") return true;
    const text = connectorText(values);
    if (!text) return false;
    if (filter === "type2") return /TYPE[_ -]?2|MENNEKES/.test(text);
    if (filter === "ccs") return /CCS|COMBO/.test(text);
    if (filter === "chademo") return /CHADEMO/.test(text);
    const dc = /CCS|COMBO|CHADEMO|GB.?T.?DC|(^|[^A-Z])DC([^A-Z]|$)/.test(text);
    if (filter === "dc") return dc;
    if (filter === "ac") return /TYPE[_ -]?[12]|MENNEKES|SCHUKO|CEE|(^|[^A-Z])AC([^A-Z]|$)/.test(text);
    return true;
  }

  function stationMatchesFilters(station) {
    const connectors = [...(station.connectors || []), ...(station.connectorNames || [])];
    return matchesConnector(connectors) && (!activeMinPower || Number(station.powerKw) >= activeMinPower);
  }

  function chargingProfile(station) {
    const connectors = [...(station.connectors || []), ...(station.connectorNames || [])];
    if (matchesConnector(connectors, "dc")) {
      return Number(station.powerKw) >= 150
        ? { kind: "hpc", label: "HPC", description: t("highPowerDescription") }
        : { kind: "dc", label: "DC", description: t("fastDescription") };
    }
    if (matchesConnector(connectors, "ac")) return { kind: "ac", label: "AC", description: t("acDescription") };
    return { kind: "other", label: "?", description: t("connectorUnknown") };
  }

  function connectedItemMatchesFilters(item) {
    if (!Array.isArray(item.plugs) || !item.plugs.length) {
      return activeConnectorFilter === "all" && activeMinPower === 0;
    }
    return item.plugs.some((plug) => matchesConnector([plug.type, plug.name])
      && (!activeMinPower || Number(plug.powerKw) >= activeMinPower));
  }

  function visibleStations() {
    return stations
      .map((station) => ({ ...station, distance: haversineMetres(searchCentre, station.position) }))
      .filter((station) => station.distance <= activeRadius)
      .filter(stationMatchesFilters)
      .sort((a, b) => Number(favoriteConnectorState(b).available > 0) - Number(favoriteConnectorState(a).available > 0)
        || Number(favorites.has(b.id)) - Number(favorites.has(a.id))
        || Number(b.current !== false) - Number(a.current !== false)
        || a.distance - b.distance
        || b.available - a.available);
  }

  function markerTitle(station) {
    const profile = chargingProfile(station);
    const power = station.powerKw ? ` · ${t("upToPower", { power: Math.round(station.powerKw) }).replace("⚡ ", "")}` : "";
    const favoriteConnector = favoriteConnectorState(station).available > 0 ? `${t("favoriteConnector")} · ` : "";
    return `${favoriteConnector}${favorites.has(station.id) ? `${t("favoriteStation")} · ` : ""}${station.address}: ${availabilityState(station).text} · ${profile.description}${power}`;
  }

  function stationFacts(station) {
    const facts = [];
    const connectorNames = [...new Set((station.connectorNames || []).filter(Boolean))];
    if (connectorNames.length) facts.push(connectorNames.join(", "));
    if (station.powerKw) facts.push(t("upToPower", { power: Math.round(station.powerKw) }).replace("⚡ ", ""));
    if (station.alwaysOpen === true) facts.push(t("openAlways"));
    if (station.payment === true) facts.push(t("paymentSupported"));
    if (station.accessible === true) facts.push(t("accessible"));
    if (station.unknown > 0) facts.push(t("unknownStatuses", { count: station.unknown, unit: t(station.unknown === 1 ? "status" : "statuses") }));
    return facts;
  }

  function connectorStatus(status) {
    const normalized = String(status || "UNKNOWN").toUpperCase();
    const labels = {
      AVAILABLE: t("available"),
      OCCUPIED: t("occupied"),
      OUT_OF_SERVICE: t("outOfService"),
      RESERVED: t("reserved"),
      UNKNOWN: t("unknown")
    };
    return { value: normalized, label: labels[normalized] || normalized.replaceAll("_", " ").toLowerCase() };
  }

  function connectorAgeText(status, timestamp) {
    const age = relativeAgeText(timestamp);
    if (!age) return null;
    const connectedStates = new Set(["OCCUPIED", "CHARGING", "SUSPENDED_EV", "SUSPENDED_EVSE"]);
    if (!connectedStates.has(String(status || "").toUpperCase())) return age;
    const elapsed = elapsedAgeText(timestamp);
    return elapsed ? t("connectedApprox", { age: elapsed }) : t("connectedUnderMinute");
  }

  function approximateConnectedDuration(timestamp) {
    const elapsed = elapsedAgeText(timestamp);
    if (!elapsed) return Number.isFinite(new Date(timestamp).getTime()) ? "<1 min" : t("durationUnknown");
    return `~${elapsed}`;
  }

  function setConnectorFavoriteButtonState(button, station, chargePoint) {
    const selected = connectorFavorites.has(connectorFavoriteKey(station.id, chargePoint.id));
    const label = chargePoint.label || chargePoint.id;
    button.dataset.favoriteConnectorId = chargePoint.id;
    button.dataset.favoriteStationId = station.id;
    button.setAttribute("aria-pressed", String(selected));
    button.setAttribute("aria-label", t("favoriteConnectorAria", { action: t(selected ? "remove" : "add"), label, preposition: t(selected ? "from" : "to") }));
    button.title = t(selected ? "removeConnectorFavorite" : "addConnectorFavorite");
    button.textContent = selected ? "♥" : "♡";
  }

  function toggleConnectorFavorite(station, chargePoint) {
    const key = connectorFavoriteKey(station.id, chargePoint.id);
    if (connectorFavorites.has(key)) connectorFavorites.delete(key);
    else connectorFavorites.set(key, {
      id: chargePoint.id,
      stationId: station.id,
      label: chargePoint.label || chargePoint.id
    });
    saveConnectorFavorites();
    refreshFavoriteConnectorPresentation(station);
  }

  function renderConnectorDetails(container, payload, station) {
    container.replaceChildren();
    container.dataset.stationId = station.id;
    if (!payload.chargePoints?.length) {
      container.textContent = t("noConnectorInfo");
      container.className = `popup-details-message${container.dataset.variant === "card" ? " card-details-message" : ""}`;
      return;
    }

    const list = document.createElement("div");
    list.className = `popup-connector-list${container.dataset.variant === "card" ? " card-connector-list" : ""}`;
    payload.chargePoints.forEach((chargePoint) => {
      const row = document.createElement("div");
      const selected = connectorFavorites.has(connectorFavoriteKey(station.id, chargePoint.id));
      const availableFavorite = selected && String(chargePoint.status).toUpperCase() === "AVAILABLE";
      row.className = `popup-connector${selected ? " is-favorite-connector" : ""}${availableFavorite ? " is-favorite-available" : ""}`;
      row.dataset.connectorId = chargePoint.id;
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
      const headingActions = document.createElement("div");
      headingActions.className = "popup-connector-heading-actions";
      const favorite = document.createElement("button");
      favorite.className = "connector-favorite-button";
      favorite.type = "button";
      setConnectorFavoriteButtonState(favorite, station, chargePoint);
      favorite.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleConnectorFavorite(station, chargePoint);
      });
      headingActions.append(status, favorite);
      heading.append(id, headingActions);

      const descriptions = (chargePoint.plugs || []).map((plug) => {
        const parts = [plug.name || plug.type || t("genericConnector")];
        if (plug.powerKw) parts.push(`${Math.round(plug.powerKw)} kW`);
        if (plug.cableAttached === true) parts.push(t("cableAttached"));
        return parts.join(" · ");
      });
      const meta = document.createElement("small");
      const updated = connectorAgeText(chargePoint.status, chargePoint.updatedAt);
      meta.textContent = [descriptions.join(" / "), updated].filter(Boolean).join(" · ");
      row.append(heading, meta);
      list.append(row);
    });
    container.className = `popup-details-content${container.dataset.variant === "card" ? " card-details-content" : ""}`;
    container.append(list);
  }

  async function fetchConnectorDetails(station) {
    const cached = connectorDetails.get(station.id);
    const cachedAt = cached?.generatedAt ? new Date(cached.generatedAt).getTime() : 0;
    if (cached && Date.now() - cachedAt < 60000) return cached;
    if (connectorDetailRequests.has(station.id)) return connectorDetailRequests.get(station.id);

    const request = (async () => {
      const url = new URL(CHARGER_DETAIL_API_URL, window.location.href);
      url.searchParams.set("id", station.id);
      const response = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || t("serviceError", { status: response.status }));
      if (!Array.isArray(payload.chargePoints)) throw new Error(t("invalidConnectorResponse"));
      connectorDetails.set(station.id, payload);
      return payload;
    })();
    connectorDetailRequests.set(station.id, request);
    try {
      return await request;
    } finally {
      connectorDetailRequests.delete(station.id);
    }
  }

  async function loadConnectorDetails(station, button, container) {
    button.disabled = true;
    button.textContent = t("loadingDetails");
    container.hidden = false;
    container.className = `popup-details-message${container.dataset.variant === "card" ? " card-details-message" : ""}`;
    container.textContent = t("contactingEnbw");
    try {
      const payload = await fetchConnectorDetails(station);
      renderConnectorDetails(container, payload, station);
      button.textContent = t("hideDetails");
    } catch (error) {
      container.textContent = t("detailsUnavailable", { error: localizedError(error.message) });
      button.textContent = t("retryDetails");
    } finally {
      button.disabled = false;
      markers.get(station.id)?.getPopup()?.update();
    }
  }

  async function refreshFavoriteConnectorAvailability(requestId) {
    const favoriteStationIds = new Set([...connectorFavorites.values()].map((item) => item.stationId));
    const relevantStations = visibleStations()
      .filter((station) => station.current !== false && favoriteStationIds.has(station.id));
    for (const station of relevantStations) {
      try {
        await fetchConnectorDetails(station);
        if (requestId !== searchRequestId) return;
        refreshFavoriteConnectorPresentation(station);
      } catch {
        // A failed background refresh should not interrupt the main charger search.
      }
    }
  }

  function renderConnectedOverview(payload) {
    const container = byId("connected-overview-content");
    container.replaceChildren();
    const connected = Array.isArray(payload.connected) ? payload.connected.filter(connectedItemMatchesFilters) : [];
    if (!connected.length) {
      container.className = "connected-overview-content connected-overview-message";
      container.textContent = t("noOccupiedMatches");
      return;
    }

    container.className = "connected-overview-content";
    const summary = document.createElement("p");
    summary.className = "connected-overview-summary";
    const failureNote = payload.failedStations ? t("unavailableCount", { count: payload.failedStations }) : "";
    summary.textContent = t("connectedSummary", { count: connected.length, locations: payload.stationsScanned, failures: failureNote });
    const ranking = document.createElement("div");
    ranking.className = "connected-ranking";
    connected.slice(0, 20).forEach((item, index) => {
      const row = document.createElement("button");
      row.className = "connected-ranking-item";
      row.type = "button";
      row.title = t("showOnMap");
      const rank = document.createElement("span");
      rank.className = "connected-rank";
      rank.textContent = String(index + 1);
      const location = document.createElement("span");
      location.className = "connected-location";
      const address = document.createElement("strong");
      address.textContent = `${favorites.has(item.stationId) ? "♥ " : ""}${item.address || t("publicLocation")}`;
      const details = document.createElement("small");
      const plug = item.plugs?.[0];
      const plugText = [plug?.name || plug?.type, plug?.powerKw ? `${Math.round(plug.powerKw)} kW` : null]
        .filter(Boolean).join(" · ");
      details.textContent = [formatDistance(item.distance), plugText, item.chargePointId].filter(Boolean).join(" · ");
      location.append(address, details);
      const duration = document.createElement("span");
      duration.className = "connected-duration";
      duration.textContent = approximateConnectedDuration(item.updatedAt);
      row.append(rank, location, duration);
      row.addEventListener("click", () => {
        byId("connected-overview-dialog").close();
        document.querySelector(".map-panel").scrollIntoView({ behavior: "smooth", block: "center" });
        window.setTimeout(() => markers.get(item.stationId)?.openPopup(), 350);
      });
      ranking.append(row);
    });
    container.append(summary, ranking);
  }

  async function openConnectedOverview() {
    const dialog = byId("connected-overview-dialog");
    const container = byId("connected-overview-content");
    dialog.showModal();
    container.className = "connected-overview-content connected-overview-message";
    container.textContent = t("scanningCircle", { radius: activeRadius < 1000 ? `${activeRadius} m` : `${activeRadius / 1000} km` });
    try {
      const url = new URL(CHARGER_DETAIL_API_URL, window.location.href);
      url.searchParams.set("mode", "overview");
      url.searchParams.set("lat", String(searchCentre[0]));
      url.searchParams.set("lon", String(searchCentre[1]));
      url.searchParams.set("radius", String(activeRadius));
      url.searchParams.set("connector", activeConnectorFilter);
      url.searchParams.set("minPower", String(activeMinPower));
      const response = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || t("serviceError", { status: response.status }));
      renderConnectedOverview(payload);
    } catch (error) {
      container.textContent = t("overviewError", { error: localizedError(error.message) });
    }
  }

  function createPopup(station) {
    const content = document.createElement("div");
    content.className = "charger-popup";
    const title = document.createElement("strong");
    title.className = "popup-title";
    title.textContent = station.address || t("publicLocation");
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
      ? `${t(station.current === false ? "lastSeen" : "stationData")}: ${age}`
      : t("stationUpdateUnavailable");

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
    directions.textContent = t("directions");
    actions.append(favorite, directions);

    const detailsButton = document.createElement("button");
    detailsButton.className = "popup-details-button";
    detailsButton.type = "button";
    detailsButton.setAttribute("aria-expanded", "false");
    detailsButton.textContent = t("showDetails");
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
        detailsButton.textContent = t("showDetails");
        return;
      }
      details.hidden = false;
      detailsButton.setAttribute("aria-expanded", "true");
      detailsButton.textContent = t("hideDetails");
      await loadConnectorDetails(station, detailsButton, details);
    });

    content.append(title, status, favoriteConnectorAlert(station, "popup"), context);
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
      const filtered = activeConnectorFilter !== "all" || activeMinPower > 0;
      list.innerHTML = filtered
        ? `<div class="empty-state"><h3>${t("noFilterMatchesTitle")}</h3><p>${t("noFilterMatchesCopy")}</p></div>`
        : `<div class="empty-state"><h3>${t("noNearbyTitle")}</h3><p>${t("noNearbyCopy")}</p></div>`;
    }

    byId("available-count").textContent = String(available);
    byId("location-count").textContent = String(visible.length);
    byId("radius-summary").textContent = activeRadius < 1000 ? `${activeRadius} m` : `${activeRadius / 1000} km`;
    void refreshFavoriteConnectorAvailability(searchRequestId);

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

  function setSearchState(state, key, params = {}) {
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
    document.querySelectorAll(".charger-filters select").forEach((select) => {
      select.disabled = loading;
    });
    label.textContent = t(loading ? "findingChargers" : "findChargers");
    help.dataset.state = state;
    currentSearchMessage = { key, params };
    help.textContent = t(key, params);
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
    if (!response.ok) throw new Error(t("postcodeServiceError", { status: response.status }));
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
    if (!response.ok) throw new Error(payload.error || t("serviceError", { status: response.status }));
    if (!Array.isArray(payload.stations)) throw new Error(t("invalidChargingResponse"));
    dataMeta = payload;
    const nextStations = payload.stations
      .filter((station) => Array.isArray(station.position) && station.position.length === 2)
      .map((station) => ({
        ...station,
        position: [Number(station.position[0]), Number(station.position[1])],
        available: Number(station.available) || 0,
        total: Number(station.total) || 0,
        current: station.current !== false
      }));
    migrateSupersededFavoriteIds(nextStations);
    stations = nextStations;
    updateDataBadge();
    return payload;
  }

  async function searchPostcode(rawPostcode) {
    const input = byId("postcode");
    const postcode = normalisePostcode(rawPostcode);
    if (!/^\d{4}[A-Z]{2}$/.test(postcode)) {
      setSearchState("error", "postcodeInvalid");
      input.focus();
      return;
    }

    const requestId = ++searchRequestId;
    setSearchState("loading", "postcodeLookup");
    try {
      const location = await geocodePostcode(postcode);
      if (!location) throw new Error("postcode-not-found");
      setSearchState("loading", "availabilityLookup");
      await loadChargerData(location.centre, activeRadius);
      if (requestId !== searchRequestId) return;
      searchCentre = location.centre;
      const formatted = formatPostcode(postcode);
      input.value = formatted;
      saveLastPostcode(formatted);
      activePostcode = formatted;
      byId("postcode-result").textContent = formatted;
      byId("map").setAttribute("aria-label", t("mapLabel", { postcode: formatted }));
      setSearchState("success", "loadingInitial");
      updateDataFreshnessLabels();
      startDataAgeClock();
      render();
    } catch (error) {
      if (error.message === "postcode-not-found") {
        setSearchState("error", "postcodeNotFound");
      } else if (/limited to the European Netherlands/i.test(error.message)) {
        setSearchState("error", "coverageError");
      } else if (/too many grouped stations|smaller radius/i.test(error.message)) {
        setSearchState("error", "denseArea");
      } else {
        setSearchState("error", "chargingUnavailable", { error: localizedError(error.message) });
      }
      input.focus();
    }
  }

  function initialiseMap() {
    if (!window.L) {
      document.querySelector(".map-panel").classList.add("map-unavailable");
      byId("map").innerHTML = `<p>${t("mapUnavailable")}</p>`;
      return;
    }
    byId("map").setAttribute("aria-label", t("mapLabel", { postcode: formatPostcode(byId("postcode").value) }));
    map = L.map("map", { zoomControl: true, scrollWheelZoom: false, attributionControl: true }).setView(searchCentre, 15);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors"
    }).addTo(map);
    stationLayer = L.layerGroup().addTo(map);
    centreMarker = L.marker(searchCentre, {
      icon: L.divIcon({ className: "search-centre" }),
      title: t("postcodeCentre")
    }).addTo(map);
  }

  document.querySelectorAll('input[name="radius"]').forEach((input) => {
    input.addEventListener("change", () => {
      activeRadius = Number(input.value);
      searchPostcode(byId("postcode").value);
    });
  });

  byId("connector-filter").addEventListener("change", (event) => {
    activeConnectorFilter = event.currentTarget.value;
    render();
  });

  byId("speed-filter").addEventListener("change", (event) => {
    activeMinPower = Number(event.currentTarget.value) || 0;
    render();
  });

  byId("charger-search").addEventListener("submit", (event) => {
    event.preventDefault();
    searchPostcode(byId("postcode").value);
  });

  document.querySelector(".reload-button").addEventListener("click", () => {
    window.location.reload();
  });

  document.querySelectorAll(".language-switch button").forEach((button) => {
    button.addEventListener("click", () => setLanguage(button.dataset.language));
  });

  document.querySelector(".map-list-toggle").addEventListener("click", (event) => {
    const button = event.currentTarget;
    const pressed = button.getAttribute("aria-pressed") === "true";
    button.setAttribute("aria-pressed", String(!pressed));
    document.querySelector(".toggle-text").textContent = t(pressed ? "showList" : "backToMap");
    (pressed ? document.querySelector(".map-panel") : byId("results")).scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.querySelector(".connected-overview-button").addEventListener("click", openConnectedOverview);
  const connectedDialog = byId("connected-overview-dialog");
  document.querySelector(".connected-dialog-close").addEventListener("click", () => {
    connectedDialog.close();
  });
  connectedDialog.addEventListener("click", (event) => {
    if (event.target === connectedDialog) connectedDialog.close();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (connectedDialog.open) connectedDialog.close();
    map?.closePopup();
  });

  document.addEventListener("pointerdown", (event) => {
    if (!map || event.target.closest(".leaflet-popup, .leaflet-marker-icon")) return;
    map.closePopup();
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) updateDataFreshnessLabels();
  });
  window.addEventListener("focus", updateDataFreshnessLabels);

  window.addEventListener("load", () => {
    translateDocument();
    const savedPostcode = loadLastPostcode();
    if (savedPostcode) byId("postcode").value = savedPostcode;
    initialiseMap();
    searchPostcode(byId("postcode").value);
  }, { once: true });
})();
