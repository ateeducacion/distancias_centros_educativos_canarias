// Interactive exercises for the mathematics page.
import { prettyPlace } from "./text.js";

const integer = new Intl.NumberFormat("es-ES");
const decimal = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 });
const $ = (selector) => document.querySelector(selector);

/* 2. Position in the flattened matrix -------------------------------------- */
const sizeInput = $("#n-size");
const sizeOut = $("#n-out");
const grid = $("#pos-grid");
const strip = $("#pos-strip");
const posSay = $("#pos-say");
const cell = { i: 2, j: 3 };

function renderPosition() {
  const n = Number(sizeInput.value);
  sizeOut.textContent = String(n);
  cell.i = Math.min(cell.i, n - 1);
  cell.j = Math.min(cell.j, n - 1);
  const p = cell.i * n + cell.j;

  grid.style.gridTemplateColumns = `repeat(${n + 1}, minmax(0, 1fr))`;
  grid.replaceChildren();
  const corner = document.createElement("span");
  corner.className = "pos-head";
  corner.textContent = "i \\ j";
  grid.append(corner);
  for (let j = 0; j < n; j += 1) {
    const head = document.createElement("span");
    head.className = `pos-head${j === cell.j ? " is-line" : ""}`;
    head.textContent = String(j);
    grid.append(head);
  }
  for (let i = 0; i < n; i += 1) {
    const head = document.createElement("span");
    head.className = `pos-head${i === cell.i ? " is-line" : ""}`;
    head.textContent = String(i);
    grid.append(head);
    for (let j = 0; j < n; j += 1) {
      const button = document.createElement("button");
      button.type = "button";
      const on = i === cell.i && j === cell.j;
      button.className = `pos-cell${i === j ? " is-diag" : ""}${
        !on && (i === cell.i || j === cell.j) ? " is-line" : ""
      }`;
      button.textContent = i === j ? "0" : `d${i}${j}`;
      button.setAttribute("aria-pressed", String(on));
      button.setAttribute("aria-label", `Origen ${i}, destino ${j}`);
      button.addEventListener("click", () => {
        cell.i = i;
        cell.j = j;
        renderPosition();
        grid.querySelector('[aria-pressed="true"]')?.focus();
      });
      grid.append(button);
    }
  }

  strip.replaceChildren();
  for (let k = 0; k < n * n; k += 1) {
    const box = document.createElement("span");
    const row = Math.floor(k / n);
    box.className = `strip-cell${k === p ? " is-hit" : ""}${
      row % 2 === 1 ? " is-odd" : ""
    }`;
    box.textContent = String(k);
    strip.append(box);
  }

  posSay.textContent = `Origen i = ${cell.i}, destino j = ${cell.j}, n = ${n}: p = ${cell.i} · ${n} + ${cell.j} = ${p}. Es la casilla número ${p} de la fila larga.`;
}

sizeInput.addEventListener("input", renderPosition);
renderPosition();

/* 3. Two bytes per distance ------------------------------------------------ */
const metersInput = $("#meters");

function renderBytes() {
  const meters = Math.max(
    1,
    Math.min(655340, Math.round(Number(metersInput.value) || 0)),
  );
  const q = Math.max(1, Math.floor((meters + 5) / 10));
  const published = q * 10;
  const low = q % 256;
  const high = Math.floor(q / 256);
  const hex = (value) => value.toString(16).toUpperCase().padStart(2, "0");
  $("#q-out").textContent = integer.format(q);
  $("#d-out").textContent = `${integer.format(published)} m`;
  $("#e-out").textContent = `${integer.format(Math.abs(published - meters))} m`;
  $("#b-out").textContent = `${low} · ${high} (0x${hex(low)} · 0x${hex(high)})`;
}

metersInput.addEventListener("input", renderBytes);
renderBytes();

/* 4 and 5. Real counts from the published manifest ------------------------- */
const ISLAND_NAMES = {
  1: "El Hierro",
  2: "Fuerteventura",
  3: "Gran Canaria",
  4: "La Gomera",
  5: "La Palma",
  6: "Lanzarote",
  7: "Tenerife",
};

function renderIslands(counts) {
  const rows = Object.entries(counts)
    .map(([id, n]) => ({
      name: ISLAND_NAMES[id] ?? `Isla ${id}`,
      n: Number(n),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
  const N = rows.reduce((sum, row) => sum + row.n, 0);
  const cells = rows.reduce((sum, row) => sum + row.n * row.n, 0);
  const all = N * N;

  $("#isl-body").replaceChildren(
    ...rows.map((row) => {
      const tr = document.createElement("tr");
      for (const value of [
        row.name,
        integer.format(row.n),
        integer.format(row.n * row.n),
      ]) {
        const td = document.createElement("td");
        td.textContent = value;
        tr.append(td);
      }
      return tr;
    }),
  );
  const foot = document.createElement("tr");
  for (const value of ["Total", integer.format(N), integer.format(cells)]) {
    const th = document.createElement("th");
    th.textContent = value;
    foot.append(th);
  }
  $("#isl-foot").replaceChildren(foot);

  $("#isl-say").textContent =
    `Con una sola tabla harían falta ${integer.format(N)}² = ${integer.format(all)} casillas. Con una por isla bastan ${integer.format(cells)}: un ${decimal.format(((all - cells) / all) * 100)} % menos, y ninguna de las que se ahorran sería un trayecto real por carretera.`;

  const size = 64 + 12 * N + 16 * rows.length + 2 * cells;
  $("#size-say").textContent =
    `S = 64 + 12 · ${integer.format(N)} + 16 · ${rows.length} + 2 · ${integer.format(cells)} = ${integer.format(size)} bytes, unos ${decimal.format(size / 1024 / 1024)} MB antes de comprimir.`;

  const steps = Math.ceil(Math.log2(N + 1));
  $("#search-say").textContent =
    `Con los ${integer.format(N)} lugares publicados bastan como mucho ${steps} pasos para encontrar un código, frente a los ${integer.format(N)} que haría falta mirar uno a uno en el peor caso.`;
}

fetch(new URL("../data/latest/manifest.json", import.meta.url))
  .then((response) => {
    if (!response.ok) throw new Error(String(response.status));
    return response.json();
  })
  .then((manifest) => {
    const counts = manifest.counts?.islands;
    if (!counts) throw new Error("Sin recuentos por isla");
    renderIslands(counts);
  })
  .catch(() => {
    $("#isl-caption").textContent =
      "No se pudieron leer los recuentos publicados.";
    $("#isl-say").hidden = true;
    $("#size-say").hidden = true;
    $("#search-say").hidden = true;
  });

/* 6. Amortisation (hypothetical values) ------------------------------------ */
const g = $("#g-cost");
const r = $("#r-cost");
const l = $("#l-cost");

function renderAmortisation() {
  const G = Number(g.value);
  const R = Number(r.value);
  const L = Number(l.value);
  $("#g-out").textContent = integer.format(G);
  $("#r-out").textContent = decimal.format(R);
  $("#l-out").textContent = decimal.format(L);
  const threshold = Math.floor(G / (R - L)) + 1;
  $("#amort-say").textContent =
    `Con G = ${integer.format(G)}, R = ${decimal.format(R)} y L = ${decimal.format(L)}, precalcular compensa a partir de ${integer.format(threshold)} consultas. Cada consulta que venga después ahorra ${decimal.format(R - L)} unidades.`;
}

for (const input of [g, r, l])
  input.addEventListener("input", renderAmortisation);
renderAmortisation();

/* 7. Amortisation chart ---------------------------------------------------- */
function drawChart() {
  const G = Number(g.value);
  const R = Number(r.value);
  const L = Number(l.value);
  const cross = G / (R - L);
  const qMax = Math.max(10, cross * 2);
  const cMax = Math.max(G + qMax * L, qMax * R);
  const x = (q) => 48 + (q / qMax) * 536;
  const y = (c) => 220 - (c / cMax) * 204;
  $("#line-pre").setAttribute(
    "d",
    `M${x(0)} ${y(G)}L${x(qMax)} ${y(G + qMax * L)}`,
  );
  $("#line-demand").setAttribute(
    "d",
    `M${x(0)} ${y(0)}L${x(qMax)} ${y(qMax * R)}`,
  );
  const line = $("#line-cross");
  line.setAttribute("x1", x(cross));
  line.setAttribute("x2", x(cross));
  line.setAttribute("y1", y(0));
  line.setAttribute("y2", y(G + cross * L));
  const label = $("#label-cross");
  label.setAttribute("x", x(cross));
  label.textContent = `Q ≈ ${integer.format(Math.ceil(cross))}`;
}

for (const input of [g, r, l]) input.addEventListener("input", drawChart);
drawChart();

/* 6. A real lookup, byte by byte ------------------------------------------- */
const realIsland = $("#real-island");
const realOrigin = $("#real-origin");
const realDestination = $("#real-destination");
const realStatus = $("#real-status");
const realSteps = $("#real-steps");
const realReverse = $("#real-reverse");
const dataBase = new URL("../data/latest/", import.meta.url);
const hex = (value, width) =>
  `0x${value.toString(16).toUpperCase().padStart(width, "0")}`;

let file = null;
let places = [];

function parseMatrix(buffer) {
  const view = new DataView(buffer);
  const magic = String.fromCharCode(...new Uint8Array(buffer, 0, 8));
  if (magic !== "CEDIST04") throw new Error("Formato inesperado");
  const islandCount = view.getUint16(20, true);
  const locationCount = view.getUint32(24, true);
  const indexOffset = Number(view.getBigUint64(28, true));
  const directoryOffset = Number(view.getBigUint64(36, true));
  const islands = new Map();
  for (let k = 0; k < islandCount; k += 1) {
    const offset = directoryOffset + k * 16;
    islands.set(view.getUint8(offset), {
      count: view.getUint32(offset + 4, true),
      distanceOffset: Number(view.getBigUint64(offset + 8, true)),
    });
  }
  return { view, locationCount, indexOffset, islands };
}

function findCode(code) {
  const { view, locationCount, indexOffset } = file;
  const target = Number(code);
  let low = 0;
  let high = locationCount - 1;
  let steps = 0;
  while (low <= high) {
    steps += 1;
    const middle = Math.floor((low + high) / 2);
    const offset = indexOffset + middle * 12;
    const value = view.getUint32(offset, true);
    if (value === target) {
      return {
        steps,
        islandId: view.getUint8(offset + 4),
        local: view.getUint16(offset + 6, true),
      };
    }
    if (value < target) low = middle + 1;
    else high = middle - 1;
  }
  throw new Error(`Código ${code} no encontrado`);
}

function readCell(island, i, j) {
  const n = island.count;
  const p = i * n + j;
  const lowOffset = island.distanceOffset + p;
  const highOffset = island.distanceOffset + n * n + p;
  const low = file.view.getUint8(lowOffset);
  const high = file.view.getUint8(highOffset);
  return { n, p, lowOffset, highOffset, low, high, q: low + 256 * high };
}

function fillSelect(select, items, selectedCode) {
  select.replaceChildren(
    ...items.map((place) => {
      const option = new Option(place.label, place.code);
      option.selected = place.code === selectedCode;
      return option;
    }),
  );
}

function islandPlaces() {
  return places.filter((place) => String(place.island_id) === realIsland.value);
}

function renderLookup() {
  const origin = realOrigin.value;
  const destination = realDestination.value;
  if (!origin || !destination || origin === destination) {
    realSteps.hidden = true;
    realReverse.hidden = true;
    realStatus.hidden = false;
    realStatus.textContent = "Elija dos lugares distintos.";
    return;
  }
  const a = findCode(origin);
  const b = findCode(destination);
  const island = file.islands.get(a.islandId);
  const cell = readCell(island, a.local, b.local);
  const back = readCell(island, b.local, a.local);
  const km = (q) =>
    new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 }).format(
      (q * 10) / 1000,
    );

  $("#t-search").textContent =
    `El código ${origin} aparece en ${a.steps} pasos y el ${destination} en ${b.steps}, entre ${integer.format(file.locationCount)} códigos. Sus índices en la tabla de la isla son i = ${a.local} y j = ${b.local}.`;
  $("#t-island").textContent =
    `Los dos están en la misma isla, cuya tabla tiene n = ${integer.format(island.count)} filas y columnas (${integer.format(island.count * island.count)} casillas).`;
  $("#t-position").textContent =
    `p = i · n + j = ${a.local} · ${integer.format(cell.n)} + ${b.local} = ${integer.format(cell.p)}.`;
  $("#t-bytes").textContent =
    `Byte bajo en la posición ${integer.format(cell.lowOffset)} del archivo: ${cell.low} (${hex(cell.low, 2)}). Byte alto, ${integer.format(cell.n * cell.n)} bytes más allá, en la ${integer.format(cell.highOffset)}: ${cell.high} (${hex(cell.high, 2)}).`;
  $("#t-result").textContent =
    `q = ${cell.low} + 256 · ${cell.high} = ${integer.format(cell.q)} decámetros, es decir, ${km(cell.q)} km por carretera.`;
  realReverse.textContent =
    back.q === cell.q
      ? `La vuelta, en la casilla (j, i), mide lo mismo: ${km(back.q)} km.`
      : `La vuelta está en otra casilla, (j, i), y mide ${km(back.q)} km: ${km(Math.abs(back.q - cell.q))} km ${back.q > cell.q ? "más" : "menos"} que la ida. Es la asimetría del apartado 1, con datos reales.`;
  realStatus.hidden = true;
  realSteps.hidden = false;
  realReverse.hidden = false;
}

function selectIsland(originCode, destinationCode) {
  const items = islandPlaces();
  fillSelect(realOrigin, items, originCode ?? items[0]?.code);
  fillSelect(realDestination, items, destinationCode ?? items[1]?.code);
  renderLookup();
}

async function loadMatrix() {
  const [dataResponse, centersResponse] = await Promise.all([
    fetch(new URL("canarias-distances.dat.gz", dataBase)),
    fetch(new URL("centers.min.json", dataBase)),
  ]);
  if (!dataResponse.ok || !centersResponse.ok) throw new Error("descarga");
  const stream = dataResponse.body.pipeThrough(new DecompressionStream("gzip"));
  file = parseMatrix(await new Response(stream).arrayBuffer());
  places = (await centersResponse.json())
    .map((place) => ({
      ...place,
      label: place.municipality
        ? `${place.name} · ${prettyPlace(place.municipality)}`
        : place.name,
    }))
    .sort((x, y) => x.label.localeCompare(y.label, "es"));

  const islands = [
    ...new Map(places.map((p) => [String(p.island_id), p.island])).entries(),
  ]
    .map(([id, name]) => [id, ISLAND_NAMES[id] ?? prettyPlace(name)])
    .sort((x, y) => x[1].localeCompare(y[1], "es"));
  realIsland.replaceChildren(
    ...islands.map(([id, name]) => new Option(name, id)),
  );
  realIsland.value = "7";
  const origin = places.find((p) => p.name.includes("CABRERA PINTO"));
  const destination = places.find(
    (p) => p.name === "Aeropuerto de Tenerife Sur",
  );
  selectIsland(origin?.code, destination?.code);
}

realIsland.addEventListener("change", () => selectIsland());
realOrigin.addEventListener("change", renderLookup);
realDestination.addEventListener("change", renderLookup);

loadMatrix().catch(() => {
  realStatus.textContent = "No se pudo descargar el archivo de distancias.";
});
