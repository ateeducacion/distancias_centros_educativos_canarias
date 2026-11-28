// Interactive explanations for the "Cómo funciona" page.
import { prettyPlace } from "./text.js";

/* Distance table with published data -------------------------------------- */
const caption = document.querySelector("#table-caption");
const head = document.querySelector("#table-head");
const body = document.querySelector("#table-body");
const say = document.querySelector("#table-say");

const TYPE_LABELS = { AIRPORT: "Aeropuerto", PORT: "Puerto" };
const ISLAND = "TENERIFE";
const TABLE_SIZE = 5;

const base = new URL("../data/latest/", import.meta.url);
const worker = new Worker(new URL("worker.js", import.meta.url), {
  type: "module",
});
const km = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 });

let places = [];
const distances = new Map();
let pending = 0;
let selected = null;

function shortName(place) {
  if (TYPE_LABELS[place.location_type]) {
    return place.name
      .replace(/^Aeropuerto de /, "Aeropuerto ")
      .replace(/-.*$/, "");
  }
  return prettyPlace(place.municipality) || place.name;
}

function pickPlaces(locations) {
  const island = locations.filter((l) => l.island === ISLAND);
  const byName = (a, b) => a.name.localeCompare(b.name, "es");
  const transport = island
    .filter((l) => TYPE_LABELS[l.location_type])
    .sort(byName)
    .slice(0, 3);
  const used = new Set(transport.map((l) => l.municipality));
  const schools = [];
  for (const location of island
    .filter((l) => l.name.startsWith("IES "))
    .sort(byName)) {
    if (schools.length + transport.length >= TABLE_SIZE) break;
    if (used.has(location.municipality)) continue;
    used.add(location.municipality);
    schools.push(location);
  }
  return [...schools, ...transport];
}

function cellText(from, to) {
  if (from === to) return "—";
  const meters = distances.get(`${from}-${to}`);
  return meters === undefined ? "…" : km.format(meters / 1000);
}

function describe(place) {
  const type = TYPE_LABELS[place.location_type];
  return type
    ? place.name
    : `${place.name} (${prettyPlace(place.municipality)})`;
}

function renderTable() {
  head.replaceChildren();
  const corner = document.createElement("th");
  corner.scope = "col";
  corner.textContent = "Desde ↓ · Hasta →";
  head.append(corner);
  places.forEach((place, column) => {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = shortName(place);
    th.title = place.name;
    if (selected && selected[1] === column) th.className = "is-line";
    head.append(th);
  });

  body.replaceChildren();
  places.forEach((from, row) => {
    const tr = document.createElement("tr");
    const th = document.createElement("th");
    th.scope = "row";
    th.textContent = shortName(from);
    th.title = from.name;
    if (selected && selected[0] === row) th.className = "is-line";
    tr.append(th);
    places.forEach((to, column) => {
      const td = document.createElement("td");
      const onLine =
        selected && (selected[0] === row || selected[1] === column);
      if (onLine) td.className = "is-line";
      if (row === column) {
        td.innerHTML = '<div class="self">—</div>';
      } else {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = cellText(from.code, to.code);
        button.setAttribute(
          "aria-label",
          `De ${describe(from)} a ${describe(to)}`,
        );
        button.setAttribute(
          "aria-pressed",
          String(
            Boolean(selected && selected[0] === row && selected[1] === column),
          ),
        );
        button.addEventListener("click", () => {
          selected = [row, column];
          renderTable();
          say.textContent = `Fila «${shortName(from)}», columna «${shortName(to)}»: ${cellText(from.code, to.code)} km por carretera desde ${describe(from)} hasta ${describe(to)}.`;
          body.querySelector('[aria-pressed="true"]')?.focus();
        });
        td.append(button);
      }
      tr.append(td);
    });
    body.append(tr);
  });
}

worker.addEventListener("message", ({ data }) => {
  if (data.type === "ready") {
    places = pickPlaces(data.locations);
    if (places.length < 2) {
      caption.textContent =
        "No hay suficientes lugares publicados para mostrar la tabla.";
      return;
    }
    caption.textContent =
      "Kilómetros por carretera en Tenerife, con los datos publicados";
    for (const from of places) {
      for (const to of places) {
        if (from === to) continue;
        pending += 1;
        worker.postMessage({
          type: "query",
          id: `${from.code}-${to.code}`,
          origin: from.code,
          destination: to.code,
        });
      }
    }
    renderTable();
  } else if (data.type === "distance") {
    distances.set(data.id, data.result.distanceMeters);
    pending -= 1;
    if (pending === 0) renderTable();
  } else if (data.type === "error") {
    pending -= 1;
    if (pending <= 0) renderTable();
  }
});

worker.addEventListener("error", () => {
  caption.textContent = "No se pudieron cargar los datos para la tabla.";
});

worker.postMessage({
  type: "load",
  dataUrl: new URL("canarias-distances.dat.gz", base).href,
  locationsUrl: new URL("centers.min.json", base).href,
  manifestUrl: new URL("manifest.json", base).href,
});

/* Dictionary-style search demo -------------------------------------------- */
const WORDS = [
  "Agaete",
  "Agüimes",
  "Artenara",
  "Arucas",
  "Firgas",
  "Gáldar",
  "Ingenio",
  "Mogán",
  "Moya",
  "Santa Brígida",
  "Santa Lucía de Tirajana",
  "Tejeda",
  "Telde",
  "Teror",
  "Valsequillo",
  "Vega de San Mateo",
];
const TARGET = WORDS.indexOf("Telde");

const list = document.querySelector("#bs-list");
const next = document.querySelector("#bs-next");
const bsSay = document.querySelector("#bs-say");
document.querySelector("#bs-target").textContent = WORDS[TARGET];

const search = {
  low: 0,
  high: WORDS.length - 1,
  middle: -1,
  steps: 0,
  found: false,
};

function renderSearch() {
  list.replaceChildren(
    ...WORDS.map((word, index) => {
      const item = document.createElement("li");
      item.textContent = word;
      if (search.found && index === TARGET) item.className = "is-hit";
      else if (index === search.middle) item.className = "is-mid is-out";
      else if (index < search.low || index > search.high)
        item.className = "is-out";
      return item;
    }),
  );
  const remaining = search.high - search.low + 1;
  if (search.found) {
    bsSay.textContent = `¡Encontrado! ${WORDS[TARGET]} en ${search.steps} pasos, sin mirar los otros nombres uno a uno.`;
    next.textContent = "Empezar de nuevo";
  } else if (search.middle < 0) {
    bsSay.textContent = `Quedan ${remaining} candidatos. Pulse para abrir por la mitad.`;
    next.textContent = "Siguiente paso";
  } else {
    const side = TARGET > search.middle ? "después" : "antes";
    bsSay.textContent = `La mitad es «${WORDS[search.middle]}». ${WORDS[TARGET]} va ${side}, así que se descarta el resto. Quedan ${remaining}.`;
    next.textContent = "Siguiente paso";
  }
}

next.addEventListener("click", () => {
  if (search.found) {
    Object.assign(search, {
      low: 0,
      high: WORDS.length - 1,
      middle: -1,
      steps: 0,
      found: false,
    });
  } else {
    const middle = Math.floor((search.low + search.high) / 2);
    search.middle = middle;
    search.steps += 1;
    if (middle === TARGET) search.found = true;
    else if (TARGET > middle) search.low = middle + 1;
    else search.high = middle - 1;
  }
  renderSearch();
});

renderSearch();
