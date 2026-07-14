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
  const copyButton = document.querySelector("#copy-result");
  const version = document.querySelector("#demo-version");
  const routeVisual = document.querySelector("#route-visual");
  const islandShapes = [...document.querySelectorAll("[data-island-id]")];
  const routeLine = document.querySelector("#route-line");
  const originPoint = document.querySelector("#origin-point");
  const destinationPoint = document.querySelector("#destination-point");
  const params = new URLSearchParams(window.location.search);
  const base = new URL("../data/latest/", import.meta.url);
  const worker = new Worker(new URL("demo-worker.mjs", import.meta.url), {
    type: "module",
  });

  const archipelagoViewBox = [0, 0, 1000, 420];
  const islandViewBoxes = new Map([
    ["1", [0, 325, 105, 95]],
    ["2", [700, 115, 210, 225]],
    ["3", [445, 240, 160, 155]],
    ["4", [150, 240, 115, 105]],
    ["5", [25, 85, 115, 145]],
    ["6", [840, 0, 150, 145]],
    ["7", [235, 145, 220, 195]],
  ]);
  const longitudeMin = -18.25;
  const longitudeSpan = 5.05;
  const latitudeMax = 29.35;
  const latitudeSpan = 1.8;
  const visualWidth = 1000;
  const visualHeight = 420;
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );

  let locations = [];
  let locationsByIsland = new Map();
  let locationByCode = new Map();
  let ready = false;
  let lastResult = "";
  let viewBoxAnimation = 0;
  let selectedIslandId = "";

  const AVERAGE_SPEED_KMH = 75;
  const option = (value, label) => new Option(label, value);
  const locationTypeLabels = {
    AIRPORT: "Aeropuerto",
    PORT: "Puerto",
  };

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

  function projectLocation(location) {
    return {
      x:
        ((Number(location.longitude) - longitudeMin) / longitudeSpan) *
        visualWidth,
      y:
        ((latitudeMax - Number(location.latitude)) / latitudeSpan) *
        visualHeight,
    };
  }

  function setPoint(element, location) {
    if (!location) {
      element.hidden = true;
      return;
    }
    const point = projectLocation(location);
    element.setAttribute("cx", String(point.x));
    element.setAttribute("cy", String(point.y));
    element.hidden = false;
  }

  function updateRouteVisual() {
    const islandId = selectedIslandId;
    for (const shape of islandShapes) {
      shape.classList.toggle(
        "is-selected",
        Boolean(islandId) && shape.dataset.islandId === islandId,
      );
    }

    const origin = locationByCode.get(originSelect.value);
    const destination = locationByCode.get(destinationSelect.value);
    setPoint(originPoint, origin);
    setPoint(destinationPoint, destination);

    if (!origin || !destination) {
      routeLine.hidden = true;
      return;
    }

    const originCoordinates = projectLocation(origin);
    const destinationCoordinates = projectLocation(destination);
    routeLine.setAttribute("x1", String(originCoordinates.x));
    routeLine.setAttribute("y1", String(originCoordinates.y));
    routeLine.setAttribute("x2", String(destinationCoordinates.x));
    routeLine.setAttribute("y2", String(destinationCoordinates.y));
    routeLine.hidden = false;
  }

  function currentViewBox() {
    const values = routeVisual.getAttribute("viewBox").split(/\s+/).map(Number);
    return values.length === 4 && values.every(Number.isFinite)
      ? values
      : archipelagoViewBox;
  }

  function setViewBox(values) {
    routeVisual.setAttribute("viewBox", values.join(" "));
  }

  function animateViewBox(target) {
    window.cancelAnimationFrame(viewBoxAnimation);
    const start = currentViewBox();
    if (prefersReducedMotion.matches) {
      setViewBox(target);
      return;
    }

    const startedAt = performance.now();
    const duration = 480;

    function frame(now) {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - (1 - progress) ** 3;
      const values = start.map(
        (value, index) => value + (target[index] - value) * eased,
      );
      setViewBox(values);
      if (progress < 1) {
        viewBoxAnimation = window.requestAnimationFrame(frame);
      }
    }

    viewBoxAnimation = window.requestAnimationFrame(frame);
  }

  function querySelection() {
    if (!ready || !selectedIslandId) {
      setResultState("Selecciona una isla para empezar.");
      updateRouteVisual();
      updateUrl();
      return;
    }
    if (!originSelect.value || !destinationSelect.value) {
      setResultState("Selecciona un origen y un destino.");
      updateRouteVisual();
      updateUrl();
      return;
    }

    setResultState("Consultando la matriz local…");
    worker.postMessage({
      type: "query",
      origin: originSelect.value,
      destination: destinationSelect.value,
    });
    updateRouteVisual();
    updateUrl();
  }

  function selectIsland(
    islandId,
    selectedOrigin = "",
    selectedDestination = "",
  ) {
    const normalizedIslandId = String(islandId);
    selectedIslandId = normalizedIslandId;
    const islandLocations = locationsByIsland.get(normalizedIslandId) ?? [];
    const hasIsland = islandLocations.length > 0;

    for (const pill of islandGroup.children) {
      const isActive = pill.dataset.islandId === normalizedIslandId;
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
    animateViewBox(
      hasIsland
        ? (islandViewBoxes.get(normalizedIslandId) ?? archipelagoViewBox)
        : archipelagoViewBox,
    );
    updateRouteVisual();
    updateUrl();
  }

  function initializeSelect2() {
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

    window.jQuery(originSelect).on("change", querySelection);
    window.jQuery(destinationSelect).on("change", querySelection);
  }

  function populateIslandPills(islands) {
    islandGroup.replaceChildren();
    for (const [id, name] of islands) {
      const pill = document.createElement("button");
      pill.type = "button";
      pill.className = "island-pill";
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
      populateIslandPills(islands);

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
      const minutes = Math.round(
        (data.result.distanceMeters / 1000 / AVERAGE_SPEED_KMH) * 60,
      );
      lastResult = `${data.origin.name} → ${data.destination.name}: ${kilometers} km (${meters} m, ≈ ${formatDuration(minutes)} en coche)`;
      resultKilometers.textContent = `${kilometers} km`;
      resultMeters.textContent = `${meters} metros por carretera`;
      resultRoute.textContent = `${data.origin.name} → ${data.destination.name}`;
      resultTimeValue.textContent = `≈ ${formatDuration(minutes)}`;
      resultState.hidden = true;
      resultValue.hidden = false;
      copyButton.hidden = false;
      updateRouteVisual();
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

  swapButton.addEventListener("click", () => {
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
