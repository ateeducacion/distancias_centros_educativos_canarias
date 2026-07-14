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
  let centers = [];
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

  function populateCenters(islandId) {
    const filtered = centers.filter(
      (center) => String(center.island_id) === String(islandId),
    );
    for (const select of [originSelect, destinationSelect]) {
      const selected = select.value;
      select.replaceChildren(option("", "Selecciona una ubicación"));
      for (const center of filtered) {
        select.add(option(center.code, locationLabel(center)));
      }
      if (filtered.some((center) => center.code === selected)) {
        select.value = selected;
      }
      window.jQuery(select).trigger("change");
    }
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
    window.jQuery(islandSelect).on("change", () =>
      populateCenters(islandSelect.value),
    );
  }

  worker.addEventListener("message", ({ data }) => {
    if (data.type === "ready") {
      centers = data.centers;
      const islands = [...new Map(
        centers.map((center) => [center.island_id, center.island]),
      )].sort((a, b) => a[1].localeCompare(b[1], "es"));
      islandSelect.replaceChildren();
      for (const [id, name] of islands) islandSelect.add(option(id, name));
      initializeSelect2();
      const requestedOrigin = params.get("origin");
      const requestedDestination = params.get("destination");
      const requestedCenter = centers.find(
        (center) => center.code === requestedOrigin,
      );
      islandSelect.value = String(requestedCenter?.island_id ?? islands[0][0]);
      window.jQuery(islandSelect).trigger("change");
      if (requestedOrigin) originSelect.value = requestedOrigin;
      if (requestedDestination) destinationSelect.value = requestedDestination;
      window.jQuery(originSelect).trigger("change");
      window.jQuery(destinationSelect).trigger("change");
      version.textContent = `Versión de datos: ${data.dataVersion}`;
      status.textContent = "Datos cargados.";
      form.hidden = false;
    } else if (data.type === "route") {
      const distance = new Intl.NumberFormat("es-ES", {
        maximumFractionDigits: 2,
      }).format(data.route.distanceMeters / 1000);
      const minutes = Math.round(data.route.durationSeconds / 60);
      lastResult = `${data.origin.name} → ${data.destination.name}: ${distance} km, ${minutes} min`;
      result.textContent = lastResult;
      copyButton.hidden = false;
    } else if (data.type === "error") {
      result.textContent = data.message;
      copyButton.hidden = true;
    }
  });

  worker.addEventListener("error", () => {
    status.textContent = "No se pudieron cargar los artefactos de la demo.";
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!originSelect.value || !destinationSelect.value) {
      result.textContent = "Selecciona un origen y un destino.";
      return;
    }
    worker.postMessage({
      type: "query",
      origin: originSelect.value,
      destination: destinationSelect.value,
    });
    const next = new URLSearchParams({
      origin: originSelect.value,
      destination: destinationSelect.value,
    });
    window.history.replaceState(null, "", `?${next}`);
  });

  document.querySelector("#swap-centers").addEventListener("click", () => {
    const origin = originSelect.value;
    originSelect.value = destinationSelect.value;
    destinationSelect.value = origin;
    window.jQuery(originSelect).trigger("change");
    window.jQuery(destinationSelect).trigger("change");
  });

  copyButton.addEventListener("click", async () => {
    await navigator.clipboard.writeText(lastResult);
    copyButton.textContent = "Copiado";
  });

  worker.postMessage({
    type: "load",
    binaryUrl: new URL("canarias-education-routes.bin", base).href,
    centersUrl: new URL("centers.min.json", base).href,
    manifestUrl: new URL("manifest.json", base).href,
  });
}
