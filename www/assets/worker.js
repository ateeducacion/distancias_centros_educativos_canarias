const MAGIC = "CEDIST04";
const MAJOR = 4;
const CELL_SIZE = 2;
const DISTANCE_UNIT_METERS = 10;
const UNREACHABLE = 0xffff;

let view;
let locationCount;
let indexOffset;
let islands;
let locations;

const u16 = (offset) => view.getUint16(offset, true);
const u32 = (offset) => view.getUint32(offset, true);
const u64 = (offset) => {
  const value = view.getBigUint64(offset, true);
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("Offset inválido");
  }
  return Number(value);
};

function parse(buffer) {
  view = new DataView(buffer);
  if (buffer.byteLength < 64) throw new Error("Archivo de distancias truncado");
  const magic = String.fromCharCode(...new Uint8Array(buffer, 0, 8));
  if (magic !== MAGIC || u16(8) !== MAJOR) {
    throw new Error("El archivo no usa el formato CEDIST04");
  }
  if (u32(12) !== 64) throw new Error("Cabecera CEDIST04 no válida");
  locationCount = u32(24);
  indexOffset = u64(28);
  const directoryOffset = u64(36);
  if (u64(44) !== buffer.byteLength) {
    throw new Error("Tamaño del archivo de distancias inválido");
  }
  islands = new Map();
  let expectedOffset = directoryOffset + u16(20) * 16;
  for (let index = 0; index < u16(20); index += 1) {
    const offset = directoryOffset + index * 16;
    const count = u32(offset + 4);
    const distanceOffset = u64(offset + 8);
    if (distanceOffset !== expectedOffset) {
      throw new Error("Directorio de islas no válido");
    }
    islands.set(view.getUint8(offset), { count, distanceOffset });
    expectedOffset += count * count * CELL_SIZE;
  }
  if (expectedOffset !== buffer.byteLength) {
    throw new Error("El archivo contiene datos inesperados");
  }
}

function find(code) {
  if (!/^\d{8}$/.test(code)) throw new Error("Código de ubicación inválido");
  const target = Number(code);
  let low = 0;
  let high = locationCount - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const offset = indexOffset + middle * 12;
    const value = u32(offset);
    if (value === target) {
      return {
        islandId: view.getUint8(offset + 4),
        localIndex: u16(offset + 6),
      };
    }
    if (value < target) low = middle + 1;
    else high = middle - 1;
  }
  throw new Error(`Ubicación desconocida: ${code}`);
}

function distance(originCode, destinationCode) {
  const origin = find(originCode);
  const destination = find(destinationCode);
  if (origin.islandId !== destination.islandId) {
    throw new Error("No se calculan distancias entre islas diferentes.");
  }
  const island = islands.get(origin.islandId);
  const count = island.count;
  const position = origin.localIndex * count + destination.localIndex;
  // Distribución por planos de byte: bytes bajos y luego bytes altos.
  const low = view.getUint8(island.distanceOffset + position);
  const high = view.getUint8(island.distanceOffset + count * count + position);
  const stored = low | (high << 8);
  if (stored === UNREACHABLE) {
    throw new Error("La distancia no está disponible.");
  }
  return { distanceMeters: stored * DISTANCE_UNIT_METERS };
}

// El artefacto de distancias se publica comprimido con gzip; se descomprime en
// el navegador con DecompressionStream (nativo, sin dependencias).
async function fetchMatrix(response) {
  if (!response.body) {
    return response.arrayBuffer();
  }
  const stream = response.body.pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).arrayBuffer();
}

self.addEventListener("message", async ({ data }) => {
  try {
    if (data.type === "load") {
      const [dataResponse, locationsResponse, manifestResponse] =
        await Promise.all([
          fetch(data.dataUrl),
          fetch(data.locationsUrl),
          fetch(data.manifestUrl),
        ]);
      if (!dataResponse.ok || !locationsResponse.ok || !manifestResponse.ok) {
        throw new Error("No se pudieron descargar los datos.");
      }
      parse(await fetchMatrix(dataResponse));
      locations = await locationsResponse.json();
      const manifest = await manifestResponse.json();
      self.postMessage({
        type: "ready",
        locations,
        dataVersion: manifest.data_version,
      });
    } else if (data.type === "query") {
      self.postMessage({
        type: "distance",
        result: distance(data.origin, data.destination),
        origin: locations.find((location) => location.code === data.origin),
        destination: locations.find(
          (location) => location.code === data.destination,
        ),
      });
    }
  } catch (error) {
    self.postMessage({ type: "error", message: error.message });
  }
});
