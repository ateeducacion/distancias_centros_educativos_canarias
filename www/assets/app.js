import { ISLAND_OUTLINES } from "./islands.js";
import { prettyPlace } from "./text.js";

const LISTADO_URL =
  "https://ateeducacion.github.io/listado-centros-educativos-canarias/";
const AVERAGE_SPEED_KMH = 75;
const MAX_SUGGESTIONS = 50;
const SVG_NS = "http://www.w3.org/2000/svg";
const TYPE_LABELS = { AIRPORT: "Aeropuerto", PORT: "Puerto" };

const $ = (selector) => document.querySelector(selector);

const ui = {
  islandGroup: $("#island-group"),
  form: $("#route-form"),
  origin: $("#origin"),
  originList: $("#origin-list"),
  destination: $("#destination"),
  destinationList: $("#destination-list"),
  swap: $("#swap"),
  dataDate: $("#data-date"),
  result: $("#result"),
  resultKm: $("#result-km"),
  resultTime: $("#result-time"),
  hint: $("#hint"),
  hintTitle: $("#hint-title"),
  hintText: $("#hint-text"),
  mapIsland: $("#map-island"),
  islandOutline: $("#island-outline"),
  points: $("#route-points"),
  missing: $("#missing-notice"),
  missingCode: $("#missing-code"),
  missingLink: $("#missing-link"),
  missingDismiss: $("#missing-dismiss"),
};

const params = new URLSearchParams(window.location.search);
const base = new URL("../data/latest/", import.meta.url);
const worker = new Worker(new URL("worker.js", import.meta.url), {
  type: "module",
});

const state = {
  ready: false,
  locations: [],
  byCode: new Map(),
  islandNames: new Map(),
  islandId: "",
  origin: null,
  destination: null,
  queryId: 0,
};

/* Text helpers ------------------------------------------------------------- */
const normalize = (text) =>
  String(text ?? "")
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

function formatIsland(value) {
  return String(value ?? "")
    .replaceAll("_", " ")
    .toLocaleLowerCase("es")
    .replace(/(^|\s)\p{L}/gu, (letter) => letter.toLocaleUpperCase("es"));
}

function formatDuration(minutes) {
  if (minutes < 1) return "menos de 1 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours} h ${String(minutes % 60).padStart(2, "0")} min`;
}

function formatDate(isoDate) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Atlantic/Canary",
  }).format(date);
}

const islandName = (location) => state.islandNames.get(location.islandId);
const labelOf = (location) =>
  location.municipality
    ? `${location.name} · ${location.municipality}`
    : location.name;
const isEducationCenter = (location) => !TYPE_LABELS[location.location_type];
const fichaUrl = (code) => `${LISTADO_URL}?centro=${encodeURIComponent(code)}`;

/* Island chips ------------------------------------------------------------- */
function renderIslandChips() {
  ui.islandGroup.replaceChildren();
  const entries = [["", "Todas"], ...state.islandNames.entries()];
  for (const [id, name] of entries) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.textContent = name;
    chip.dataset.islandId = id;
    chip.setAttribute("aria-pressed", String(id === state.islandId));
    chip.addEventListener("click", () => selectIsland(id));
    ui.islandGroup.append(chip);
  }
}

function selectIsland(islandId) {
  state.islandId = islandId;
  for (const chip of ui.islandGroup.children) {
    chip.setAttribute(
      "aria-pressed",
      String(chip.dataset.islandId === islandId),
    );
  }
  if (islandId) {
    if (state.origin && state.origin.islandId !== islandId) setOrigin(null);
    if (state.destination && state.destination.islandId !== islandId) {
      setDestination(null);
    }
  }
  update();
}

/* Combobox ----------------------------------------------------------------- */
function createCombobox(input, list, { candidates, onPick }) {
  let options = [];
  let active = -1;

  function close() {
    list.hidden = true;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    active = -1;
  }

  function highlight(index) {
    active = index;
    [...list.children].forEach((item, position) => {
      item.setAttribute("aria-selected", String(position === index));
    });
    if (index >= 0 && list.children[index]) {
      input.setAttribute("aria-activedescendant", list.children[index].id);
      list.children[index].scrollIntoView({ block: "nearest" });
    }
  }

  function pick(location) {
    input.value = labelOf(location);
    close();
    onPick(location);
  }

  function open() {
    const terms = normalize(input.value).split(/\s+/).filter(Boolean);
    options = candidates()
      .filter((location) => terms.every((term) => location.key.includes(term)))
      .slice(0, MAX_SUGGESTIONS);
    list.replaceChildren();
    if (options.length === 0) {
      const empty = document.createElement("li");
      empty.className = "s-empty";
      empty.textContent = "No hay ningún lugar con ese nombre en esta isla.";
      list.append(empty);
    }
    options.forEach((location, index) => {
      const item = document.createElement("li");
      item.id = `${list.id}-${index}`;
      item.setAttribute("role", "option");
      item.setAttribute("aria-selected", "false");
      const name = document.createElement("span");
      name.className = "s-name";
      name.textContent = location.name;
      const meta = document.createElement("span");
      meta.className = "s-meta";
      meta.textContent = [
        TYPE_LABELS[location.location_type],
        location.municipality,
        islandName(location),
        location.code,
      ]
        .filter(Boolean)
        .join(" · ");
      item.append(name, meta);
      item.addEventListener("mousedown", (event) => {
        event.preventDefault();
        pick(location);
      });
      list.append(item);
    });
    list.hidden = false;
    input.setAttribute("aria-expanded", "true");
    highlight(options.length > 0 && terms.length > 0 ? 0 : -1);
  }

  input.addEventListener("input", () => {
    onPick(null, { keepText: true });
    open();
  });
  input.addEventListener("focus", open);
  input.addEventListener("blur", close);
  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (list.hidden) open();
      highlight(Math.min(active + 1, options.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      highlight(Math.max(active - 1, 0));
    } else if (event.key === "Enter") {
      if (!list.hidden && options[active]) {
        event.preventDefault();
        pick(options[active]);
      }
    } else if (event.key === "Escape") {
      close();
    }
  });

  return { close };
}

function originCandidates() {
  return state.islandId
    ? state.locations.filter((l) => l.islandId === state.islandId)
    : state.locations;
}

function destinationCandidates() {
  if (state.origin) {
    return state.locations.filter(
      (l) =>
        l.islandId === state.origin.islandId && l.code !== state.origin.code,
    );
  }
  return originCandidates();
}

function setOrigin(location, { keepText = false } = {}) {
  state.origin = location;
  if (!keepText) ui.origin.value = location ? labelOf(location) : "";
  if (location && state.islandId !== location.islandId) {
    selectIsland(location.islandId);
    return;
  }
  update();
}

function setDestination(location, { keepText = false } = {}) {
  state.destination = location;
  if (!keepText) ui.destination.value = location ? labelOf(location) : "";
  if (location && !state.origin && state.islandId !== location.islandId) {
    selectIsland(location.islandId);
    return;
  }
  update();
}

/* Result ------------------------------------------------------------------- */
function showHint(title, text = "") {
  ui.result.hidden = true;
  ui.hint.hidden = false;
  ui.hintTitle.textContent = title;
  ui.hintText.textContent = text;
}

function updateUrl() {
  const next = new URLSearchParams();
  if (state.origin) next.set("origin", state.origin.code);
  if (state.destination) next.set("destination", state.destination.code);
  const query = next.toString();
  window.history.replaceState(
    null,
    "",
    query ? `?${query}` : window.location.pathname,
  );
}

function update() {
  if (!state.ready) return;
  updateUrl();
  const { origin, destination } = state;
  if (!origin && !destination) {
    showHint(
      "Escriba dos lugares para ver la distancia.",
      "Puede buscar por el nombre del centro, su código o el municipio.",
    );
    return;
  }
  if (!origin) {
    showHint(
      "Falta el origen.",
      "Elija de la lista el lugar desde el que sale.",
    );
    return;
  }
  if (!destination) {
    showHint(
      "Falta el destino.",
      `La lista muestra solo lugares de ${islandName(origin)}.`,
    );
    return;
  }
  if (origin.islandId !== destination.islandId) {
    showHint(
      "Estos dos lugares están en islas distintas.",
      `${origin.name} está en ${islandName(origin)} y ${destination.name} en ${islandName(destination)}. Solo se calculan trayectos por carretera dentro de una misma isla.`,
    );
    return;
  }
  if (origin.code === destination.code) {
    showHint(
      "El origen y el destino son el mismo lugar.",
      "Elija otro destino.",
    );
    return;
  }
  state.queryId += 1;
  worker.postMessage({
    type: "query",
    id: state.queryId,
    origin: origin.code,
    destination: destination.code,
  });
}

function fillLeg(prefix, location) {
  $(`#${prefix}-name`).textContent = location.name;
  $(`#${prefix}-where`).textContent = [
    TYPE_LABELS[location.location_type],
    location.municipality,
    islandName(location),
  ]
    .filter(Boolean)
    .join(" · ");
  const link = $(`#${prefix}-link`);
  link.hidden = !isEducationCenter(location);
  link.href = fichaUrl(location.code);
}

function showDistance(distanceMeters) {
  const { origin, destination } = state;
  ui.resultKm.textContent = new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: 2,
  }).format(distanceMeters / 1000);
  ui.resultTime.textContent = formatDuration(
    Math.round((distanceMeters / 1000 / AVERAGE_SPEED_KMH) * 60),
  );
  fillLeg("origin", origin);
  fillLeg("destination", destination);
  renderMap(origin, destination);
  ui.hint.hidden = true;
  ui.result.hidden = false;
}

/* Map ---------------------------------------------------------------------- */
function renderMap(origin, destination) {
  const islandLocations = state.locations.filter(
    (l) => l.islandId === origin.islandId,
  );
  ui.mapIsland.textContent = islandName(origin);
  const rings = ISLAND_OUTLINES[origin.island];
  const frame = rings
    ? rings.flat()
    : islandLocations.map((p) => [Number(p.longitude), Number(p.latitude)]);
  const minLng = Math.min(...frame.map((p) => p[0]));
  const maxLng = Math.max(...frame.map((p) => p[0]));
  const minLat = Math.min(...frame.map((p) => p[1]));
  const maxLat = Math.max(...frame.map((p) => p[1]));
  // A degree of longitude shrinks with the cosine of the latitude.
  const shrink = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
  const width = (maxLng - minLng) * shrink;
  const height = maxLat - minLat;
  const scale = 84 / Math.max(width, height, 1e-9);
  const px = (lng) =>
    (100 - width * scale) / 2 + (lng - minLng) * shrink * scale;
  const py = (lat) => (100 - height * scale) / 2 + (maxLat - lat) * scale;

  ui.islandOutline.setAttribute(
    "d",
    (rings ?? [])
      .map(
        (ring) =>
          "M" +
          ring
            .map(([lng, lat]) => `${px(lng).toFixed(1)} ${py(lat).toFixed(1)}`)
            .join("L") +
          "Z",
      )
      .join(""),
  );

  ui.points.replaceChildren();
  const point = (location) => [
    px(Number(location.longitude)),
    py(Number(location.latitude)),
  ];
  for (const location of islandLocations) {
    if (location === origin || location === destination) continue;
    const [x, y] = point(location);
    const dot = document.createElementNS(SVG_NS, "circle");
    dot.setAttribute("cx", x.toFixed(1));
    dot.setAttribute("cy", y.toFixed(1));
    dot.setAttribute("r", "0.9");
    dot.setAttribute("class", "route-dot--other");
    ui.points.append(dot);
  }
  const [ox, oy] = point(origin);
  const [dx, dy] = point(destination);
  const line = document.createElementNS(SVG_NS, "line");
  line.setAttribute("x1", ox.toFixed(1));
  line.setAttribute("y1", oy.toFixed(1));
  line.setAttribute("x2", dx.toFixed(1));
  line.setAttribute("y2", dy.toFixed(1));
  line.setAttribute("class", "route-line");
  const start = document.createElementNS(SVG_NS, "circle");
  start.setAttribute("cx", ox.toFixed(1));
  start.setAttribute("cy", oy.toFixed(1));
  start.setAttribute("r", "2.6");
  start.setAttribute("class", "route-dot--origin");
  const end = document.createElementNS(SVG_NS, "rect");
  end.setAttribute("x", (dx - 2.5).toFixed(1));
  end.setAttribute("y", (dy - 2.5).toFixed(1));
  end.setAttribute("width", "5");
  end.setAttribute("height", "5");
  end.setAttribute("class", "route-dot--dest");
  ui.points.append(line, start, end);
}

/* Startup ------------------------------------------------------------------ */
function showMissing(code) {
  ui.missingCode.textContent = code;
  ui.missingLink.href = fichaUrl(code);
  ui.missing.hidden = false;
}

function applyRequestedSelection() {
  const requestedOrigin = params.get("origin");
  const requestedDestination = params.get("destination");
  const origin = state.byCode.get(requestedOrigin) ?? null;
  const destination = state.byCode.get(requestedDestination) ?? null;
  if (requestedOrigin && !origin) showMissing(requestedOrigin);
  else if (requestedDestination && !destination) {
    showMissing(requestedDestination);
  }
  state.origin = origin;
  state.destination = destination;
  ui.origin.value = origin ? labelOf(origin) : "";
  ui.destination.value = destination ? labelOf(destination) : "";
  const islandId = origin?.islandId ?? destination?.islandId ?? "";
  if (islandId) selectIsland(islandId);
  else update();
}

worker.addEventListener("message", ({ data }) => {
  if (data.type === "ready") {
    state.locations = data.locations
      .map((location) => {
        const islandId = String(location.island_id);
        return {
          ...location,
          municipality: prettyPlace(location.municipality),
          islandId,
          key: normalize(
            [location.name, location.code, location.municipality].join(" "),
          ),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
    state.byCode = new Map(state.locations.map((l) => [l.code, l]));
    state.islandNames = new Map(
      [...new Map(state.locations.map((l) => [l.islandId, l.island])).entries()]
        .map(([id, island]) => [id, formatIsland(island)])
        .sort((a, b) => a[1].localeCompare(b[1], "es")),
    );
    const date = formatDate(data.generatedAt);
    ui.dataDate.textContent = date
      ? `Datos actualizados el ${date}`
      : `Datos: ${data.dataVersion}`;
    renderIslandChips();
    ui.origin.disabled = false;
    ui.destination.disabled = false;
    ui.swap.disabled = false;
    state.ready = true;
    applyRequestedSelection();
  } else if (data.type === "distance") {
    if (data.id === state.queryId) showDistance(data.result.distanceMeters);
  } else if (data.type === "error") {
    showHint("No se ha podido calcular la distancia.", data.message);
  }
});

worker.addEventListener("error", () => {
  ui.dataDate.textContent = "No se pudieron cargar los datos";
  showHint(
    "La calculadora no está disponible en este momento.",
    "Vuelva a intentarlo dentro de un rato.",
  );
});

createCombobox(ui.origin, ui.originList, {
  candidates: originCandidates,
  onPick: (location, options) => setOrigin(location, options),
});
createCombobox(ui.destination, ui.destinationList, {
  candidates: destinationCandidates,
  onPick: (location, options) => setDestination(location, options),
});

ui.form.addEventListener("submit", (event) => event.preventDefault());

ui.swap.addEventListener("click", () => {
  const { origin, destination } = state;
  state.origin = destination;
  state.destination = origin;
  ui.origin.value = destination ? labelOf(destination) : "";
  ui.destination.value = origin ? labelOf(origin) : "";
  update();
});

ui.missingDismiss.addEventListener("click", () => {
  ui.missing.hidden = true;
});

worker.postMessage({
  type: "load",
  dataUrl: new URL("canarias-distances.dat.gz", base).href,
  locationsUrl: new URL("centers.min.json", base).href,
  manifestUrl: new URL("manifest.json", base).href,
});
