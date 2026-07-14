const form = document.querySelector("#route-demo");

if (form) {
  const status = document.querySelector("#demo-status");
  const islandSelect = document.querySelector("#island");
  const locationControls = document.querySelector("#location-controls");
  const originSelect = document.querySelector("#origin");
  const destinationSelect = document.querySelector("#destination");
  const resultState = document.querySelector("#result-state");
  const resultValue = document.querySelector("#result-value");
  const resultKilometers = document.querySelector("#result-kilometers");
  const resultMeters = document.querySelector("#result-meters");
  const resultRoute = document.querySelector("#result-route");
  const copyButton = document.querySelector("#copy-result");
  const version = document.querySelector("#demo-version");
  const mapPanel = document.querySelector("#map-panel");
  const mapTitle = document.querySelector("#map-title");
  const mapElement = document.querySelector("#locations-map");
  const mapFallback = document.querySelector("#map-fallback");
  const mapModeButtons = [...document.querySelectorAll("[data-map-target]")];
  const params = new URLSearchParams(window.location.search);
  const base = new URL("../data/latest/", import.meta.url);
  const worker = new Worker(new URL("demo-worker.mjs", import.meta.url), {
    type: "module",
  });

  let locations = [];
  let locationsByIsland = new Map();
  let locationByCode = new Map();
  let markerByCode = new Map();
  let map = null;
  let mapLayer = null;
  let activeMapTarget = "origin";
  let ready = false;
  let lastResult = "";

  const option = (value, label) => new Option(label, value);
  const locationTypeLabels = {
    AIRPORT: "Aeropuerto",
    PORT: "Puerto",
  };

  function locationLabel(location) {
    const type = locationTypeLabels[location.location_type];
    const prefix = type ? `[${type}] ` : "";
    return `${prefix}${location.name} (${location.code})`;
  }

  function formatIsland(value) {
    return String(value ?? "")
      .replaceAll("_", " ")
      .toLocaleLowerCase("es")
      .replace(/(^|\s)\p{L}/gu, (letter) => letter.toLocaleUpperCase("es"));
  }

  function locationMeta(location) {
    return [
      locationTypeLabels[location.location_type],
      location.municipality,
      location.locality,
      location.code,
    ]
      .filter(Boolean)
      .join(" · ");
  }

  function setResultState(message) {
    resultState.textContent = message;
    resultState.hidden = false;
    resultValue.hidden = true;
    copyButton.hidden = true;
  }

  function setMapTarget(target) {
    activeMapTarget = target;
    for (const button of mapModeButtons) {
      button.classList.toggle("is-active", button.dataset.mapTarget === target);
    }
  }

  function updateUrl() {
    if (!originSelect.value || !destinationSelect.value) {
      window.history.replaceState(null, "", window.location.pathname);
      return;
    }
    const next = new URLSearchParams({
      origin: originSelect.value,
      destination: destinationSelect.value,
    });
    window.history.replaceState(null, "", `?${next}`);
  }

  function populateLocationSelect(select, candidates, selectedValue = "") {
    select.replaceChildren(option("", "Buscar por nombre o código"));
    for (const location of candidates) {
      select.add(option(location.code, locationLabel(location)));
    }
    if (candidates.some((location) => location.code === selectedValue)) {
      select.value = selectedValue;
    }
    window.jQuery(select).trigger("change.select2");
  }

  function updateMarkerStyles() {
    const origin = originSelect.value;
    const destination = destinationSelect.value;
    for (const [code, marker] of markerByCode) {
      let color = "#2563eb";
      let radius = 4;
      let weight = 1;
      if (code === origin) {
        color = "#15803d";
        radius = 8;
        weight = 3;
      } else if (code === destination) {
        color = "#7c3aed";
        radius = 8;
        weight = 3;
      }
      marker.setRadius(radius);
      marker.setStyle({
        color,
        fillColor: color,
        fillOpacity: code === origin || code === destination ? 1 : 0.72,
        weight,
      });
    }
  }

  function focusSelection() {
    if (!map) return;
    const origin = locationByCode.get(originSelect.value);
    const destination = locationByCode.get(destinationSelect.value);
    if (origin && destination) {
      map.fitBounds(
        [
          [origin.latitude, origin.longitude],
          [destination.latitude, destination.longitude],
        ],
        { maxZoom: 13, padding: [48, 48] },
      );
    } else if (origin || destination) {
      const location = origin ?? destination;
      map.flyTo([location.latitude, location.longitude], 12, { duration: 0.4 });
    }
  }

  function querySelection() {
    if (!ready || !originSelect.value || !destinationSelect.value) {
      setResultState("Selecciona un origen y un destino.");
      updateMarkerStyles();
      updateUrl();
      return;
    }
    setResultState("Consultando la matriz local…");
    worker.postMessage({
      type: "query",
      origin: originSelect.value,
      destination: destinationSelect.value,
    });
    updateMarkerStyles();
    focusSelection();
    updateUrl();
  }

  function chooseLocationFromMap(code) {
    const select = activeMapTarget === "origin" ? originSelect : destinationSelect;
    select.value = code;
    window.jQuery(select).trigger("change.select2");
    querySelection();
    if (activeMapTarget === "origin") setMapTarget("destination");
  }

  function clearMap() {
    markerByCode = new Map();
    if (mapLayer) mapLayer.clearLayers();
  }

  function renderIslandMap(islandLocations) {
    if (!window.L) {
      mapElement.hidden = true;
      mapFallback.hidden = false;
      return;
    }
    if (!map) {
      map = window.L.map(mapElement, {
        preferCanvas: true,
        attributionControl: false,
        minZoom: 8,
        maxZoom: 18,
      });
      mapLayer = window.L.layerGroup().addTo(map);
    }

    clearMap();
    const bounds = [];
    for (const location of islandLocations) {
      if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) {
        continue;
      }
      const marker = window.L.circleMarker(
        [location.latitude, location.longitude],
        {
          radius: 4,
          weight: 1,
          color: "#2563eb",
          fillColor: "#2563eb",
          fillOpacity: 0.72,
        },
      );
      marker.bindTooltip(location.name, { direction: "top" });
      marker.bindPopup(
        '<span class="location-popup-name"></span><span class="location-popup-meta"></span>',
      );
      marker.on("popupopen", ({ popup }) => {
        const element = popup.getElement();
        element.querySelector(".location-popup-name").textContent = location.name;
        element.querySelector(".location-popup-meta").textContent =
          locationMeta(location);
      });
      marker.on("click", () => chooseLocationFromMap(location.code));
      marker.addTo(mapLayer);
      markerByCode.set(location.code, marker);
      bounds.push([location.latitude, location.longitude]);
    }

    window.setTimeout(() => {
      map.invalidateSize();
      if (bounds.length > 0) {
        map.fitBounds(bounds, { maxZoom: 12, padding: [32, 32] });
      }
    }, 0);
  }

  function selectIsland(islandId, selectedOrigin = "", selectedDestination = "") {
    const islandLocations = locationsByIsland.get(String(islandId)) ?? [];
    const islandName = islandLocations[0]?.island;
    const hasIsland = islandLocations.length > 0;

    locationControls.hidden = !hasIsland;
    mapPanel.hidden = !hasIsland;
    populateLocationSelect(originSelect, islandLocations, selectedOrigin);
    populateLocationSelect(destinationSelect, islandLocations, selectedDestination);
    setMapTarget("origin");
    setResultState("Selecciona un origen y un destino.");
    updateUrl();

    if (hasIsland) {
      mapTitle.textContent = `Ubicaciones de ${formatIsland(islandName)}`;
      renderIslandMap(islandLocations);
      updateMarkerStyles();
    } else {
      clearMap();
    }
  }

  function initializeSelect2() {
    window.jQuery(islandSelect).select2({
      placeholder: "Selecciona una isla",
      width: "100%",
    });
    const locationOptions = {
      allowClear: true,
      width: "100%",
      language: {
        noResults: () => "No se encontraron ubicaciones",
      },
    };
    window.jQuery(originSelect).select2({
      ...locationOptions,
      placeholder: "Buscar origen",
    });
    window.jQuery(destinationSelect).select2({
      ...locationOptions,
      placeholder: "Buscar destino",
    });

    window.jQuery(islandSelect).on("change", () => {
      selectIsland(islandSelect.value);
    });
    window.jQuery(originSelect).on("change", () => {
      if (originSelect.value && !destinationSelect.value) {
        setMapTarget("destination");
      }
      querySelection();
    });
    window.jQuery(destinationSelect).on("change", querySelection);
  }

  function applyRequestedSelection() {
    const requestedOrigin = params.get("origin");
    const requestedDestination = params.get("destination");
    const requestedLocation =
      locationByCode.get(requestedOrigin) ?? locationByCode.get(requestedDestination);
    if (!requestedLocation) return;

    islandSelect.value = String(requestedLocation.island_id);
    window.jQuery(islandSelect).trigger("change.select2");
    selectIsland(
      requestedLocation.island_id,
      requestedOrigin ?? "",
      requestedDestination ?? "",
    );
  }

  worker.addEventListener("message", ({ data }) => {
    if (data.type === "ready") {
      locations = data.locations.sort((first, second) =>
        locationLabel(first).localeCompare(locationLabel(second), "es"),
      );
      locationByCode = new Map(
        locations.map((location) => [location.code, location]),
      );
      locationsByIsland = new Map();
      for (const location of locations) {
        const islandId = String(location.island_id);
        const islandLocations = locationsByIsland.get(islandId) ?? [];
        islandLocations.push(location);
        locationsByIsland.set(islandId, islandLocations);
      }

      const islands = [...locationsByIsland.entries()]
        .map(([id, islandLocations]) => [id, islandLocations[0].island])
        .sort((first, second) =>
          formatIsland(first[1]).localeCompare(formatIsland(second[1]), "es"),
        );
      islandSelect.replaceChildren(option("", "Selecciona una isla"));
      for (const [id, name] of islands) {
        islandSelect.add(option(id, formatIsland(name)));
      }

      populateLocationSelect(originSelect, []);
      populateLocationSelect(destinationSelect, []);
      initializeSelect2();
      ready = true;
      status.hidden = true;
      form.hidden = false;
      version.textContent = `Datos: ${data.dataVersion}`;
      applyRequestedSelection();
    } else if (data.type === "distance") {
      const kilometers = new Intl.NumberFormat("es-ES", {
        maximumFractionDigits: 2,
      }).format(data.result.distanceMeters / 1000);
      const meters = new Intl.NumberFormat("es-ES").format(
        data.result.distanceMeters,
      );
      lastResult = `${data.origin.name} → ${data.destination.name}: ${kilometers} km (${meters} m)`;
      resultKilometers.textContent = `${kilometers} km`;
      resultMeters.textContent = `${meters} metros por carretera`;
      resultRoute.textContent = `${data.origin.name} → ${data.destination.name}`;
      resultState.hidden = true;
      resultValue.hidden = false;
      copyButton.hidden = false;
      updateMarkerStyles();
    } else if (data.type === "error") {
      setResultState(data.message);
    }
  });

  worker.addEventListener("error", () => {
    status.textContent = "No se pudieron cargar los datos de la demo.";
    status.hidden = false;
    setResultState("La calculadora no está disponible en este momento.");
  });

  form.addEventListener("submit", (event) => event.preventDefault());

  for (const button of mapModeButtons) {
    button.addEventListener("click", () => setMapTarget(button.dataset.mapTarget));
  }

  document.querySelector("#swap-centers").addEventListener("click", () => {
    const origin = originSelect.value;
    originSelect.value = destinationSelect.value;
    destinationSelect.value = origin;
    window.jQuery(originSelect).trigger("change.select2");
    window.jQuery(destinationSelect).trigger("change.select2");
    querySelection();
  });

  copyButton.addEventListener("click", async () => {
    await navigator.clipboard.writeText(lastResult);
    copyButton.textContent = "Copiado";
    window.setTimeout(() => {
      copyButton.textContent = "Copiar resultado";
    }, 1500);
  });

  worker.postMessage({
    type: "load",
    dataUrl: new URL("canarias-distances.dat", base).href,
    locationsUrl: new URL("centers.min.json", base).href,
    manifestUrl: new URL("manifest.json", base).href,
  });
}
