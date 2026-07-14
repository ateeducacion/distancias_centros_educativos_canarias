const form = document.querySelector("#route-demo");

if (form) {
  const status = document.querySelector("#demo-status");
  const result = document.querySelector("#result");
  const copyButton = document.querySelector("#copy-result");
  const islandSelect = document.querySelector("#island");
  const originSelect = document.querySelector("#origin");
  const destinationSelect = document.querySelector("#destination");
  const version = document.querySelector("#demo-version");
  const params = new URLSearchParams(window.location.search);
  const base = new URL("../data/latest/", import.meta.url);
  const worker = new Worker(new URL("demo-worker.mjs", import.meta.url), {
    type: "module",
  });
  let locations = [];
  let ready = false;
  let lastResult = "";

  const option = (value, label) => new Option(label, value);
  const locationTypeLabels = {
    AIRPORT: "Aeropuerto",
    PORT: "Puerto",
  };
  const locationLabel = (location) => {
    const type = locationTypeLabels[location.location_type];
    const prefix = type ? `[${type}] ` : "";
    return `${prefix}${location.name} (${location.code})`;
  };

  function updateUrl() {
    if (!originSelect.value || !destinationSelect.value) return;
    const next = new URLSearchParams({
      origin: originSelect.value,
      destination: destinationSelect.value,
    });
    window.history.replaceState(null, "", `?${next}`);
  }

  function querySelection() {
    if (!ready || !originSelect.value || !destinationSelect.value) {
      result.textContent = "Selecciona un origen y un destino.";
      copyButton.hidden = true;
      return;
    }
    result.textContent = "Consultando la matriz local…";
    worker.postMessage({
      type: "query",
      origin: originSelect.value,
      destination: destinationSelect.value,
    });
    updateUrl();
  }

  function populateLocations(islandId) {
    const filtered = locations.filter(
      (location) => String(location.island_id) === String(islandId),
    );
    ready = false;
    for (const select of [originSelect, destinationSelect]) {
      const selected = select.value;
      select.replaceChildren(option("", "Selecciona una ubicación"));
      for (const location of filtered) {
        select.add(option(location.code, locationLabel(location)));
      }
      if (filtered.some((location) => location.code === selected)) {
        select.value = selected;
      }
      window.jQuery(select).trigger("change.select2");
    }
    ready = true;
    querySelection();
  }

  function initializeSelect2() {
    window.jQuery(islandSelect).select2({
      placeholder: "Selecciona una isla",
      width: "100%",
    });
    window.jQuery(originSelect).select2({
      placeholder: "Buscar origen",
      allowClear: true,
      width: "100%",
    });
    window.jQuery(destinationSelect).select2({
      placeholder: "Buscar destino",
      allowClear: true,
      width: "100%",
    });
    window.jQuery(islandSelect).on("change", () => {
      populateLocations(islandSelect.value);
    });
    for (const select of [originSelect, destinationSelect]) {
      window.jQuery(select).on("change", querySelection);
    }
  }

  worker.addEventListener("message", ({ data }) => {
    if (data.type === "ready") {
      locations = data.locations;
      const islands = [
        ...new Map(
          locations.map((location) => [location.island_id, location.island]),
        ),
      ].sort((first, second) => first[1].localeCompare(second[1], "es"));
      islandSelect.replaceChildren();
      for (const [id, name] of islands) islandSelect.add(option(id, name));
      initializeSelect2();

      const requestedOrigin = params.get("origin");
      const requestedDestination = params.get("destination");
      const requestedLocation = locations.find(
        (location) => location.code === requestedOrigin,
      );
      islandSelect.value = String(requestedLocation?.island_id ?? islands[0][0]);
      window.jQuery(islandSelect).trigger("change.select2");
      populateLocations(islandSelect.value);
      if (requestedOrigin) originSelect.value = requestedOrigin;
      if (requestedDestination) destinationSelect.value = requestedDestination;
      window.jQuery(originSelect).trigger("change.select2");
      window.jQuery(destinationSelect).trigger("change.select2");

      ready = true;
      version.textContent = `Datos: ${data.dataVersion}`;
      status.textContent = "Matriz cargada. Las consultas se resuelven en este navegador.";
      form.hidden = false;
      querySelection();
    } else if (data.type === "distance") {
      const distance = new Intl.NumberFormat("es-ES", {
        maximumFractionDigits: 2,
      }).format(data.result.distanceMeters / 1000);
      lastResult = `${data.origin.name} → ${data.destination.name}: ${distance} km`;
      result.textContent = lastResult;
      copyButton.hidden = false;
    } else if (data.type === "error") {
      result.textContent = data.message;
      copyButton.hidden = true;
    }
  });

  worker.addEventListener("error", () => {
    status.textContent = "No se pudieron cargar los datos de la demo.";
  });

  form.addEventListener("submit", (event) => event.preventDefault());

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
  });

  worker.postMessage({
    type: "load",
    dataUrl: new URL("canarias-distances.dat", base).href,
    locationsUrl: new URL("centers.min.json", base).href,
    manifestUrl: new URL("manifest.json", base).href,
  });
}
