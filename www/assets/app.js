/* Theme toggle -------------------------------------------------------------- */
const root = document.documentElement;
const themeToggle = document.querySelector("#theme-toggle");
const storedTheme = window.localStorage.getItem("distance-theme");
if (storedTheme) root.setAttribute("data-theme", storedTheme);

function currentTheme() {
  const explicit = root.getAttribute("data-theme");
  if (explicit) return explicit;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const next = currentTheme() === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    window.localStorage.setItem("distance-theme", next);
  });
}

/* Calculator ---------------------------------------------------------------- */
const form = document.querySelector("#route-demo");

if (form) {
  const status = document.querySelector("#demo-status");
  const islandGroup = document.querySelector("#island-group");
  const originSelect = document.querySelector("#origin");
  const destinationSelect = document.querySelector("#destination");
  const swapButton = document.querySelector("#swap-centers");
  const resultState = document.querySelector("#result-state");
  const resultValue = document.querySelector("#result-value");
  const resultKilometers = document.querySelector("#result-kilometers");
  const resultMeters = document.querySelector("#result-meters");
  const resultRoute = document.querySelector("#result-route");
  const resultTimeValue = document.querySelector("#result-time-value");
  const version = document.querySelector("#demo-version");
  const mapCard = document.querySelector("#route-map-card");
  const routeLine = document.querySelector("#route-line");
  const pointGroup = document.querySelector("#route-points");
  const params = new URLSearchParams(window.location.search);
  const base = new URL("../data/latest/", import.meta.url);
  const worker = new Worker(new URL("worker.js", import.meta.url), {
    type: "module",
  });

  const AVERAGE_SPEED_KMH = 75;
  const SVG_NS = "http://www.w3.org/2000/svg";

  let locationByCode = new Map();
  let locationsByIsland = new Map();
  let ready = false;
  let selectedIslandId = "";

  const option = (value, label) => new Option(label, value);
  const locationTypeLabels = { AIRPORT: "Aeropuerto", PORT: "Puerto" };

  function formatDuration(minutes) {
    if (minutes < 1) return "menos de 1 min";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return `${hours} h ${String(rest).padStart(2, "0")} min`;
  }

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

  function setResultState(message) {
    resultState.textContent = message;
    resultState.hidden = false;
    resultValue.hidden = true;
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
    const placeholder =
      candidates.length > 0
        ? "Buscar por nombre o código"
        : "Selecciona una isla primero";
    select.replaceChildren(option("", placeholder));
    for (const location of candidates) {
      select.add(option(location.code, locationLabel(location)));
    }
    if (candidates.some((location) => location.code === selectedValue)) {
      select.value = selectedValue;
    }
    window.jQuery(select).trigger("change.select2");
  }

  function setLocationControlsEnabled(enabled) {
    originSelect.disabled = !enabled;
    destinationSelect.disabled = !enabled;
    swapButton.disabled = !enabled;
    window.jQuery(originSelect).trigger("change.select2");
    window.jQuery(destinationSelect).trigger("change.select2");
  }

  function renderMap() {
    const islandLocations = locationsByIsland.get(selectedIslandId) ?? [];
    pointGroup.replaceChildren();
    if (islandLocations.length === 0) {
      mapCard.hidden = true;
      return;
    }
    mapCard.hidden = false;

    const lats = islandLocations.map((p) => Number(p.latitude));
    const lngs = islandLocations.map((p) => Number(p.longitude));
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const spanLat = maxLat - minLat || 1;
    const spanLng = maxLng - minLng || 1;
    const pad = 16;
    const range = 100 - pad * 2;
    const px = (lng) => pad + ((lng - minLng) / spanLng) * range;
    const py = (lat) => pad + ((maxLat - lat) / spanLat) * range;

    const originCode = originSelect.value;
    const destinationCode = destinationSelect.value;

    for (const location of islandLocations) {
      const role =
        location.code === originCode
          ? "origin"
          : location.code === destinationCode
            ? "dest"
            : "other";
      const circle = document.createElementNS(SVG_NS, "circle");
      circle.setAttribute("cx", px(Number(location.longitude)).toFixed(1));
      circle.setAttribute("cy", py(Number(location.latitude)).toFixed(1));
      circle.setAttribute("r", role === "other" ? "2" : "4.2");
      circle.setAttribute("class", `route-dot route-dot--${role}`);
      pointGroup.append(circle);
    }

    const origin = locationByCode.get(originCode);
    const destination = locationByCode.get(destinationCode);
    if (origin && destination && originCode !== destinationCode) {
      routeLine.setAttribute("x1", px(Number(origin.longitude)).toFixed(1));
      routeLine.setAttribute("y1", py(Number(origin.latitude)).toFixed(1));
      routeLine.setAttribute(
        "x2",
        px(Number(destination.longitude)).toFixed(1),
      );
      routeLine.setAttribute("y2", py(Number(destination.latitude)).toFixed(1));
      routeLine.hidden = false;
    } else {
      routeLine.hidden = true;
    }
  }

  function querySelection() {
    if (!ready || !selectedIslandId) {
      setResultState("Selecciona una isla para empezar.");
      renderMap();
      updateUrl();
      return;
    }
    if (!originSelect.value || !destinationSelect.value) {
      setResultState("Selecciona un origen y un destino.");
      renderMap();
      updateUrl();
      return;
    }
    setResultState("Consultando la matriz local…");
    worker.postMessage({
      type: "query",
      origin: originSelect.value,
      destination: destinationSelect.value,
    });
    renderMap();
    updateUrl();
  }

  function selectIsland(
    islandId,
    selectedOrigin = "",
    selectedDestination = "",
  ) {
    selectedIslandId = String(islandId);
    const islandLocations = locationsByIsland.get(selectedIslandId) ?? [];
    const hasIsland = islandLocations.length > 0;

    for (const pill of islandGroup.children) {
      const isActive = pill.dataset.islandId === selectedIslandId;
      pill.classList.toggle("is-active", isActive);
      pill.setAttribute("aria-pressed", String(isActive));
    }

    populateLocationSelect(originSelect, islandLocations, selectedOrigin);
    populateLocationSelect(
      destinationSelect,
      islandLocations,
      selectedDestination,
    );
    setLocationControlsEnabled(hasIsland);
    setResultState(
      hasIsland
        ? "Selecciona un origen y un destino."
        : "Selecciona una isla para empezar.",
    );
    renderMap();
    updateUrl();
  }

  function initializeSelect2() {
    const locationOptions = {
      allowClear: true,
      width: "100%",
      language: { noResults: () => "No se encontraron ubicaciones" },
    };
    window.jQuery(originSelect).select2({
      ...locationOptions,
      placeholder: "Buscar origen",
    });
    window.jQuery(destinationSelect).select2({
      ...locationOptions,
      placeholder: "Buscar destino",
    });
    window.jQuery(originSelect).on("change", querySelection);
    window.jQuery(destinationSelect).on("change", querySelection);
  }

  function populateIslandPills(islands) {
    islandGroup.replaceChildren();
    for (const [id, name] of islands) {
      const pill = document.createElement("button");
      pill.type = "button";
      pill.className = "pill";
      pill.dataset.islandId = id;
      pill.textContent = formatIsland(name);
      pill.setAttribute("aria-pressed", "false");
      pill.addEventListener("click", () => selectIsland(id));
      islandGroup.append(pill);
    }
  }

  function applyRequestedSelection() {
    const requestedOrigin = params.get("origin");
    const requestedDestination = params.get("destination");
    const requestedLocation =
      locationByCode.get(requestedOrigin) ??
      locationByCode.get(requestedDestination);
    if (!requestedLocation) {
      selectIsland("");
      return;
    }
    selectIsland(
      requestedLocation.island_id,
      requestedOrigin ?? "",
      requestedDestination ?? "",
    );
    querySelection();
  }

  worker.addEventListener("message", ({ data }) => {
    if (data.type === "ready") {
      const locations = data.locations.sort((first, second) =>
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
      populateIslandPills(islands);
      populateLocationSelect(originSelect, []);
      populateLocationSelect(destinationSelect, []);
      initializeSelect2();
      ready = true;
      status.hidden = true;
      form.hidden = false;
      if (version) version.textContent = `Datos: ${data.dataVersion}`;
      applyRequestedSelection();
    } else if (data.type === "distance") {
      const kilometers = new Intl.NumberFormat("es-ES", {
        maximumFractionDigits: 2,
      }).format(data.result.distanceMeters / 1000);
      const meters = new Intl.NumberFormat("es-ES").format(
        data.result.distanceMeters,
      );
      const minutes = Math.round(
        (data.result.distanceMeters / 1000 / AVERAGE_SPEED_KMH) * 60,
      );
      resultKilometers.textContent = kilometers;
      resultMeters.textContent = `${meters} metros por carretera`;
      resultRoute.textContent = `${data.origin.name}  →  ${data.destination.name}`;
      resultTimeValue.textContent = `≈ ${formatDuration(minutes)}`;
      resultState.hidden = true;
      resultValue.hidden = false;
      renderMap();
    } else if (data.type === "error") {
      setResultState(data.message);
    }
  });

  worker.addEventListener("error", () => {
    status.textContent = "No se pudieron cargar los datos.";
    status.hidden = false;
    setResultState("La calculadora no está disponible en este momento.");
  });

  form.addEventListener("submit", (event) => event.preventDefault());

  swapButton.addEventListener("click", () => {
    const origin = originSelect.value;
    originSelect.value = destinationSelect.value;
    destinationSelect.value = origin;
    window.jQuery(originSelect).trigger("change.select2");
    window.jQuery(destinationSelect).trigger("change.select2");
    querySelection();
  });

  worker.postMessage({
    type: "load",
    dataUrl: new URL("canarias-distances.dat.gz", base).href,
    locationsUrl: new URL("centers.min.json", base).href,
    manifestUrl: new URL("manifest.json", base).href,
  });
}
