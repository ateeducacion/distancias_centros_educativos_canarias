// Interactive exercises for the mathematics page.

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
