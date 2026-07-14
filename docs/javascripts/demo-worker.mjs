const MAGIC = "CEDIST01";
const UNREACHABLE = 0xffffffff;
let view;
let centerCount;
let indexOffset;
let islands;
let centers;

const u16 = (offset) => view.getUint16(offset, true);
const u32 = (offset) => view.getUint32(offset, true);
const u64 = (offset) => {
  const value = view.getBigUint64(offset, true);
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("Offset inválido");
  return Number(value);
};

function parse(buffer) {
  view = new DataView(buffer);
  if (buffer.byteLength < 64) throw new Error("Binario truncado");
  const magic = String.fromCharCode(...new Uint8Array(buffer, 0, 8));
  if (magic !== MAGIC || u16(8) > 1 || u32(12) !== 64) {
    throw new Error("Formato CEDIST01 no válido");
  }
  centerCount = u32(24);
  indexOffset = u64(28);
  const directoryOffset = u64(36);
  if (u64(44) !== buffer.byteLength) throw new Error("Tamaño binario inválido");
  islands = new Map();
  for (let i = 0; i < u16(20); i += 1) {
    const offset = directoryOffset + i * 24;
    islands.set(view.getUint8(offset), {
      count: u32(offset + 4),
      distanceOffset: u64(offset + 8),
      durationOffset: u64(offset + 16),
    });
  }
}

function find(code) {
  if (!/^\d{8}$/.test(code)) throw new Error("Código de centro inválido");
  const target = Number(code);
  let low = 0;
  let high = centerCount - 1;
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
  throw new Error(`Centro desconocido: ${code}`);
}

function route(originCode, destinationCode) {
  const origin = find(originCode);
  const destination = find(destinationCode);
  if (origin.islandId !== destination.islandId) {
    throw new Error("No se calculan rutas entre islas diferentes.");
  }
  const island = islands.get(origin.islandId);
  const position = origin.localIndex * island.count + destination.localIndex;
  const distanceMeters = u32(island.distanceOffset + position * 4);
  const durationSeconds = u32(island.durationOffset + position * 4);
  if (distanceMeters === UNREACHABLE || durationSeconds === UNREACHABLE) {
    throw new Error("La ruta no está disponible.");
  }
  return { distanceMeters, durationSeconds };
}

self.addEventListener("message", async ({ data }) => {
  try {
    if (data.type === "load") {
      const [binaryResponse, centersResponse, manifestResponse] = await Promise.all([
        fetch(data.binaryUrl),
        fetch(data.centersUrl),
        fetch(data.manifestUrl),
      ]);
      if (!binaryResponse.ok || !centersResponse.ok || !manifestResponse.ok) {
        throw new Error("No se pudieron descargar los artefactos.");
      }
      parse(await binaryResponse.arrayBuffer());
      centers = await centersResponse.json();
      const manifest = await manifestResponse.json();
      self.postMessage({ type: "ready", centers, dataVersion: manifest.data_version });
    } else if (data.type === "query") {
      self.postMessage({
        type: "route",
        route: route(data.origin, data.destination),
        origin: centers.find((center) => center.code === data.origin),
        destination: centers.find((center) => center.code === data.destination),
      });
    }
  } catch (error) {
    self.postMessage({ type: "error", message: error.message });
  }
});
