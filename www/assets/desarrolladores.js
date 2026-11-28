// Developer page: file sizes and date from the manifest, copy buttons and
// language examples.

const base = new URL("../data/latest/", import.meta.url);
const dataDate = document.querySelector("#data-date");
document.querySelector("#base-url").textContent = base.href;

const DOWNLOAD_ICON =
  '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"></path></svg>';
const LINK_ICON =
  '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a5 5 0 0 0 7.1 0l3-3a5 5 0 0 0-7.1-7.1l-1 1"></path><path d="M14 10a5 5 0 0 0-7.1 0l-3 3a5 5 0 0 0 7.1 7.1l1-1"></path></svg>';

/* Files -------------------------------------------------------------------- */
for (const row of document.querySelectorAll("[data-file]")) {
  const file = row.dataset.file;
  const url = new URL(file, base).href;
  const actions = row.querySelector(".file-actions");

  const download = document.createElement("a");
  download.className = "btn";
  download.href = url;
  download.setAttribute("download", "");
  download.innerHTML = `${DOWNLOAD_ICON} Descargar`;

  const copy = document.createElement("button");
  copy.type = "button";
  copy.className = "btn";
  copy.setAttribute("aria-label", `Copiar enlace a ${file}`);
  const label = document.createElement("span");
  label.textContent = "Copiar enlace";
  copy.innerHTML = LINK_ICON;
  copy.append(label);
  let timer;
  copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(url);
      label.textContent = "Enlace copiado";
    } catch {
      label.textContent = "No se pudo copiar";
    }
    clearTimeout(timer);
    timer = setTimeout(() => {
      label.textContent = "Copiar enlace";
    }, 2500);
  });

  actions.append(download, copy);
}

function formatBytes(bytes) {
  const format = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 });
  if (bytes >= 1024 * 1024) return `${format.format(bytes / 1024 / 1024)} MB`;
  if (bytes >= 1024) return `${format.format(bytes / 1024)} KB`;
  return `${bytes} B`;
}

fetch(new URL("manifest.json", base))
  .then((response) => {
    if (!response.ok) throw new Error(String(response.status));
    return response.json();
  })
  .then((manifest) => {
    const date = new Date(manifest.generated_at);
    const parts = [];
    if (!Number.isNaN(date.getTime())) {
      parts.push(
        `Datos actualizados el ${new Intl.DateTimeFormat("es-ES", {
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "Atlantic/Canary",
        }).format(date)}`,
      );
    }
    if (manifest.data_version) parts.push(`versión ${manifest.data_version}`);
    if (manifest.counts?.centers) {
      parts.push(
        `${new Intl.NumberFormat("es-ES").format(manifest.counts.centers)} lugares`,
      );
    }
    dataDate.textContent = parts.join(" · ") || "Datos publicados";
    for (const row of document.querySelectorAll("[data-file]")) {
      const size = manifest.artifacts?.[row.dataset.file]?.size;
      const slot = row.querySelector(".file-size");
      if (slot && Number.isInteger(size))
        slot.textContent = ` · ${formatBytes(size)}`;
    }
  })
  .catch(() => {
    dataDate.textContent = "No se pudo leer el manifiesto";
  });

/* Examples ----------------------------------------------------------------- */
const DOCS =
  "https://github.com/ateeducacion/distancias_centros_educativos_canarias/blob/main/docs/";
const EXAMPLES = [
  {
    label: "JavaScript",
    intro:
      "En el navegador o en Node. Descarga los dos archivos una vez; después cada consulta es instantánea y no hace peticiones.",
    more: ["Guía completa de JavaScript", `${DOCS}javascript.md`],
    code: `import { DistanceMatrix } from "https://cdn.jsdelivr.net/gh/ateeducacion/distancias_centros_educativos_canarias@main/packages/javascript/src/index.js";

const base = "${base.href}";
const matrix = await DistanceMatrix.load({
  dataUrl: \`\${base}canarias-distances.dat\`,
  centersUrl: \`\${base}centers.min.json\`,
});

const { distanceMeters } = matrix.getDistance("35000011", "98030001");
console.log(\`\${(distanceMeters / 1000).toFixed(1)} km\`);`,
  },
  {
    label: "Python",
    intro:
      "Instale el lector desde el repositorio y abra el archivo descargado.",
    more: ["Guía completa de Python", `${DOCS}python.md`],
    code: `# python -m pip install "canarias-route-matrix @ git+https://github.com/ateeducacion/distancias_centros_educativos_canarias.git"

from canarias_route_matrix.binary import Reader

with Reader("canarias-distances.dat") as reader:
    result = reader.get_distance("35000011", "98030001")

print(result.distance_meters)`,
  },
  {
    label: "PHP",
    intro:
      "Lee solo la casilla pedida del archivo, sin cargarlo entero en memoria.",
    more: ["Guía completa de PHP", `${DOCS}php.md`],
    code: `<?php
use AteEducacion\\CanariasRouteMatrix\\Reader;

$reader = new Reader(__DIR__ . '/var/data/canarias-distances.dat');
$distance = $reader->getDistance('35000011', '98030001');

echo $distance->distanceMeters;`,
  },
  {
    label: "WordPress",
    intro:
      "Un fragmento de código añade un shortcode. Escríbalo en cualquier entrada o página.",
    more: ["Guía completa de WordPress", `${DOCS}wordpress.md`],
    code: `[distancia_canarias origen="35000011" destino="98030001"]`,
  },
  {
    label: "Terminal",
    intro: "La biblioteca de Python trae una orden para consultas sueltas.",
    more: ["Guía de la línea de órdenes", `${DOCS}cli.md`],
    code: `canarias-route-matrix --json query 35000011 98030001 \\
  --data canarias-distances.dat`,
  },
  {
    label: "API REST",
    intro:
      "Si prefiere no instalar nada en su aplicación, puede desplegar el servicio web del repositorio y consultarlo por HTTP.",
    more: ["Guía de la API REST", `${DOCS}rest-api.md`],
    code: `GET /v1/distances/35000011/98030001

{ "distance_m": … }`,
  },
];

const group = document.querySelector("#lang-group");
const intro = document.querySelector("#lang-intro");
const code = document.querySelector("#lang-code");
const more = document.querySelector("#lang-more");

function show(index) {
  const example = EXAMPLES[index];
  for (const [position, chip] of [...group.children].entries()) {
    chip.setAttribute("aria-pressed", String(position === index));
  }
  intro.textContent = example.intro;
  code.textContent = example.code;
  more.textContent = example.more[0];
  more.href = example.more[1];
}

EXAMPLES.forEach((example, index) => {
  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "chip";
  chip.textContent = example.label;
  chip.addEventListener("click", () => show(index));
  group.append(chip);
});
show(0);
