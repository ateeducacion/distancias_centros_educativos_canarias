const form = document.querySelector("#route-demo");

if (form) {
  const status = document.querySelector("#demo-status");
  const resultState = document.querySelector("#result-state");
  const resultValue = document.querySelector("#result-value");
  const resultKilometers = document.querySelector("#result-kilometers");
  const resultMeters = document.querySelector("#result-meters");
  const resultRoute = document.querySelector("#result-route");
  const copyButton = document.querySelector("#copy-result");
  const originSelect = document.querySelector("#origin");
  const destinationSelect = document.querySelector("#destination");
  const version = document.querySelector("#demo-version");
  const mapElement = document.querySelector("#locations-map");
  const mapFallback = document.querySelector("#map-fallback");
  const mapModeButtons = [...document.querySelectorAll("[data-map-target]")];
  const params = new URLSearchParams(window.location.search);
  const base = new URL("../data/latest/", import.meta.url);
  const worker = new Worker(new URL("demo-worker.mjs", import.meta.url), {
    type: "module",
  });
  const defaultBounds = [
    [27.55, -18.25],
    [29.45, -13.25],
  ];
  const islandColors = [
    "#2563eb",
    "#db2777",
    "#16a34a",
    "#9333ea",
    "#ea580c",
    "#0891b2",
    "#ca8a04",
    "#4f46e5",
  ];
  let locations = [];
  let locationByCode = new Map();
  let markerByCode = new Map();
  let colorByIsland = new Map();
  let map = null;
  let ready = false;
  let syncing = false;
  let activeMapTarget = "origin";
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
      formatIsland(location.island),
      location.code,
    ]
      .filter(Boolean)
      .join(" · ");
  }

  function convexHull(points) {
    if (points.length <= 2) return points;
    const sorted = [...points].sort(
      (first, second) =>
        first[0] - second[0] || first[1] - second[1],
    );
    const cross = (origin, first, second) =>
      (first[0] - origin[0]) * (second[1] - origin[1]) -
      (first[1] - origin[1]) * (second[0] - origin[0]);
    const lower = [];
    for (const point of sorted) {
      while (
        lower.length >= 2 &&
        cross(lower.at(-2), lower.at(-1), point) <= 0
      ) {
        lower.pop();
      }
      lower.push(point);
    }
    const upper = [];
    for (const point of [...sorted].reverse()) {
      while (
        upper.length >= 2 &&
        cross(upper.at(-2), upper.at(-1), point) <= 0
      ) {
        upper.pop();
      }
      upper.push(point);
    }
    lower.pop();
    upper.pop();
    return lower.concat(upper);
  }

  function setResultState(message) {
    resultState.textContent = message;
    resultState.hidden = false;
    resultValue.hidden = true;
    copyButton.hidden = true;
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

  function setMapTarget(target) {
    activeMapTarget = target;
    for (const button of mapModeButtons) {
      button.classList.toggle("is-active", button.dataset.mapTarget === target);
    }
  }

  function selectCandidates(select) {
    const otherCode =
      select === originSelect ? destinationSelect.value : originSelect.value;
    const otherLocation = locationByCode.get(otherCode);
    if (!otherLocation) return locations;
    return locations.filter(
      (location) => String(location.island_id) === String(otherLocation.island_id),
    );
  }

  function populateSelect(select, candidates, selectedValue = "") {
    select.replaceChildren(option("", "Busca por nombre o código"));
    for (const location of candidates) {
      select.add(option(location.code, locationLabel(location)));
    }
    if (candidates.some((location) => location.code === selectedValue)) {
      select.value = selectedValue;
    }
    window.jQuery(select).trigger("change.select2");
  }

  function synchronizeSelects(changedSelect) {
    if (syncing) return;
    syncing = true;
    const otherSelect =
      changedSelect === originSelect ? destinationSelect : originSelect;
    const otherValue = otherSelect.value;
    populateSelect(otherSelect, selectCandidates(otherSelect), otherValue);
    syncing = false;
  }

  function selectedLocations() {
    return {
      origin: locationByCode.get(originSelect.value),
      destination: locationByCode.get(destinationSelect.value),
    };
  }

  function updateMarkerStyles() {
    const { origin, destination } = selectedLocations();
    for (const location of locations) {
      const marker = markerByCode.get(location.code);
      if (!marker) continue;
      let color = colorByIsland.get(String(location.island_id));
      let radius = 4;
      let weight = 1;
      let fillOpacity = 0.72;
      if (location.code === origin?.code) {
        color = "#15803d";
        radius = 8;
        weight = 3;
        fillOpacity = 1;
      } else if (location.code === destination?.code) {
        color = "#7c3aed";
        radius = 8;
        weight = 3;
        fillOpacity = 1;
      } else if (
        origin &&
        String(location.island_id) !== String(origin.island_id)
      ) {
        fillOpacity = 0.2;
      }
      marker.setRadius(radius);
      marker.setStyle({ color, fillColor: color, fillOpacity, weight });
    }
  }

  function focusSelection() {
    if (!map) return;
    const { origin, destination } = selectedLocations();
    if (origin && destination) {
      map.fitBounds(
        [
          [origin.latitude, origin.longitude],
          [destination.latitude, destination.longitude],
        ],
        { maxZoom: 12, padding: [48, 48] },
      );
    } else if (origin || destination) {
      const location = origin ?? destination;
      map.flyTo([location.latitude, location.longitude], 11, { duration: 0.5 });
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

  function handleSelection(select) {
    synchronizeSelects(select);
    if (select === originSelect && originSelect.value && !destinationSelect.value) {
      setMapTarget("destination");
    }
    querySelection();
  }

  function initializeSelect2() {
    const select2Options = {
      allowClear: true,
      width: "100%",
      language: {
        noResults: () => "No se encontraron ubicaciones",
      },
    };
    window.jQuery(originSelect).select2({
      ...select2Options,
      placeholder: "Buscar origen",
    });
    window.jQuery(destinationSelect).select2({
      ...select2Options,
      placeholder: "Buscar destino",
    });
    window.jQuery(originSelect).on("change", () => handleSelection(originSelect));
    window
      .jQuery(destinationSelect)
      .on("change", () => handleSelection(destinationSelect));
  }

  function chooseLocationFromMap(code) {
    const target = activeMapTarget;
    const select = target === "origin" ? originSelect : destinationSelect;
    const candidates = selectCandidates(select);
    const resetsOtherSelection = !candidates.some(
      (candidate) => candidate.code === code,
    );
    if (resetsOtherSelection) {
      const otherSelect =
        select === originSelect ? destinationSelect : originSelect;
      syncing = true;
      otherSelect.value = "";
      populateSelect(select, locations, code);
      populateSelect(otherSelect, locations, "");
      syncing = false;
    } else {
      select.value = code;
      window.jQuery(select).trigger("change.select2");
    }
    handleSelection(select);
    if (resetsOtherSelection) {
      setMapTarget(target === "origin" ? "destination" : "origin");
    } else if (target === "origin") {
      setMapTarget("destination");
    }
  }

  function initializeMap() {
    if (!window.L) {
      mapElement.hidden = true;
      mapFallback.hidden = false;
      return;
    }

    map = window.L.map(mapElement, {
      preferCanvas: true,
      zoomControl: true,
      attributionControl: false,
      minZoom: 6,
      maxZoom: 18,
      maxBounds: defaultBounds,
      maxBoundsViscosity: 0.8,
    });
    map.fitBounds(defaultBounds);

    const islands = [
      ...new Map(
        locations.map((location) => [String(location.island_id), location.island]),
      ),
    ].sort((first, second) => first[1].localeCompare(second[1], "es"));
    colorByIsland = new Map(
      islands.map(([id], index) => [id, islandColors[index % islandColors.length]]),
    );

    for (const [islandId, islandName] of islands) {
      const islandLocations = locations.filter(
        (location) => String(location.island_id) === islandId,
      );
      const points = islandLocations
        .filter(
          (location) =>
            Number.isFinite(location.latitude) &&
            Number.isFinite(location.longitude),
        )
        .map((location) => [location.longitude, location.latitude]);
      const color = colorByIsland.get(islandId);
      const hull = convexHull(points);
      if (hull.length >= 3) {
        window.L
          .polygon(
            hull.map(([longitude, latitude]) => [latitude, longitude]),
            {
              color,
              fillColor: color,
              fillOpacity: 0.08,
              interactive: false,
              weight: 1,
            },
          )
          .addTo(map);
      }
      if (points.length > 0) {
        const center = points.reduce(
          (current, point) => [
            current[0] + point[0] / points.length,
            current[1] + point[1] / points.length,
          ],
          [0, 0],
        );
        window.L
          .tooltip({
            className: "island-map-label",
            direction: "center",
            interactive: false,
            permanent: true,
          })
          .setLatLng([center[1], center[0]])
          .setContent(formatIsland(islandName))
          .addTo(map);
      }
    }

    for (const location of locations) {
      if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) {
        continue;
      }
      const color = colorByIsland.get(String(location.island_id));
      const marker = window.L.circleMarker(
        [location.latitude, location.longitude],
        {
          radius: 4,
          weight: 1,
          color,
          fillColor: color,
          fillOpacity: 0.72,
        },
      );
      marker.bindTooltip(location.name, { direction: "top" });
      marker.bindPopup(
        `<span class="location-popup-name"></span><span class="location-popup-meta"></span>`,
      );
      marker.on("popupopen", ({ popup }) => {
        const element = popup.getElement();
        element.querySelector(".location-popup-name").textContent = location.name;
        element.querySelector(".location-popup-meta").textContent =
          locationMeta(location);
      });
      marker.on("click", () => chooseLocationFromMap(location.code));
      marker.addTo(map);
      markerByCode.set(location.code, marker);
    }
  }

  function applyRequestedSelection() {
    const requestedOrigin = params.get("origin");
    const requestedDestination = params.get("destination");
    populateSelect(originSelect, locations, requestedOrigin ?? "");
    populateSelect(destinationSelect, locations, requestedDestination ?? "");
    if (requestedOrigin) synchronizeSelects(originSelect);
    if (!originSelect.value && requestedDestination) {
      synchronizeSelects(destinationSelect);
    }
  }

  worker.addEventListener("message", ({ data }) => {
    if (data.type === "ready") {
      locations = data.locations.sort((first, second) =>
        locationLabel(first).localeCompare(locationLabel(second), "es"),
      );
      locationByCode = new Map(
        locations.map((location) => [location.code, location]),
      );
      populateSelect(originSelect, locations);
      populateSelect(destinationSelect, locations);
      initializeSelect2();
      applyRequestedSelection();
      initializeMap();

      ready = true;
      version.textContent = `Datos: ${data.dataVersion}`;
      status.textContent =
        "Matriz cargada. Las consultas se resuelven en este navegador.";
      form.hidden = false;
      querySelection();
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
    setResultState("La calculadora no está disponible en este momento.");
  });

  form.addEventListener("submit", (event) => event.preventDefault());

  for (const button of mapModeButtons) {
    button.addEventListener("click", () => setMapTarget(button.dataset.mapTarget));
  }

  document.querySelector("#swap-centers").addEventListener("click", () => {
    const origin = originSelect.value;
    const destination = destinationSelect.value;
    syncing = true;
    populateSelect(originSelect, locations, destination);
    populateSelect(destinationSelect, selectCandidates(destinationSelect), origin);
    syncing = false;
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
