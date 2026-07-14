// SPDX-License-Identifier: MIT
const MAGIC = "CEDIST01",
  HEADER = 64,
  INDEX = 12,
  DIRECTORY = 24,
  UNREACHABLE = 0xffffffff;
export class InvalidFormatError extends Error {}
export class UnknownCenterError extends Error {}
export class CrossIslandRouteError extends Error {}
export class UnreachableRouteError extends Error {}
const ascii = (view, start, length) =>
  String.fromCharCode(
    ...new Uint8Array(view.buffer, view.byteOffset + start, length),
  );
export class RouteMatrix {
  constructor(buffer, centers = []) {
    this.buffer = buffer;
    this.view = new DataView(buffer);
    this.centers = centers;
    this.#parse();
  }
  static async load({ binaryUrl, centersUrl }) {
    const [binary, centers] = await Promise.all([
      fetch(binaryUrl),
      fetch(centersUrl),
    ]);
    if (!binary.ok || !centers.ok)
      throw new Error("Unable to load route matrix artifacts");
    return new RouteMatrix(await binary.arrayBuffer(), await centers.json());
  }
  #u16(o) {
    this.#bounds(o, 2);
    return this.view.getUint16(o, true);
  }
  #u32(o) {
    this.#bounds(o, 4);
    return this.view.getUint32(o, true);
  }
  #u64(o) {
    this.#bounds(o, 8);
    const n = this.view.getBigUint64(o, true);
    if (n > BigInt(Number.MAX_SAFE_INTEGER))
      throw new InvalidFormatError("Offset overflow");
    return Number(n);
  }
  #bounds(o, n) {
    if (!Number.isSafeInteger(o) || o < 0 || o > this.buffer.byteLength - n)
      throw new InvalidFormatError("Truncated or out-of-range read");
  }
  #parse() {
    if (this.buffer.byteLength < HEADER || ascii(this.view, 0, 8) !== MAGIC)
      throw new InvalidFormatError("Unknown magic or truncated file");
    if (this.#u16(8) > 1) throw new InvalidFormatError("Unsupported version");
    if (this.#u32(12) !== 64 || this.#u32(16) !== 0 || this.#u16(22) !== 0)
      throw new InvalidFormatError("Invalid header");
    for (let i = 52; i < 64; i++)
      if (this.view.getUint8(i) !== 0)
        throw new InvalidFormatError("Reserved header bytes must be zero");
    this.centerCount = this.#u32(24);
    this.indexOffset = this.#u64(28);
    const directory = this.#u64(36),
      declared = this.#u64(44);
    if (
      declared !== this.buffer.byteLength ||
      this.indexOffset !== 64 ||
      directory !== 64 + this.centerCount * INDEX
    )
      throw new InvalidFormatError("Invalid offsets");
    this.islands = new Map();
    const count = this.#u16(20);
    for (let i = 0; i < count; i++) {
      const o = directory + i * DIRECTORY,
        id = this.view.getUint8(o),
        n = this.#u32(o + 4),
        distance = this.#u64(o + 8),
        duration = this.#u64(o + 16);
      if (
        this.view.getUint8(o + 1) ||
        this.view.getUint8(o + 2) ||
        this.view.getUint8(o + 3) ||
        duration !== distance + n * n * 4 ||
        duration + n * n * 4 > declared
      )
        throw new InvalidFormatError("Invalid island directory");
      this.islands.set(id, { count: n, distance, duration });
    }
  }
  #code(code) {
    if (typeof code !== "string" || !/^\d{8}$/.test(code))
      throw new UnknownCenterError(`Invalid center code: ${code}`);
    const value = Number(code);
    if (value > 0xffffffff)
      throw new UnknownCenterError("Center code exceeds uint32");
    return value;
  }
  find(code) {
    const target = this.#code(code);
    let low = 0,
      high = this.centerCount - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2),
        o = this.indexOffset + mid * INDEX,
        value = this.#u32(o);
      if (value === target) {
        const entry = {
          code,
          islandId: this.view.getUint8(o + 4),
          localIndex: this.#u16(o + 6),
          metadataIndex: this.#u32(o + 8),
        };
        const island = this.islands.get(entry.islandId);
        if (!island || entry.localIndex >= island.count)
          throw new InvalidFormatError("Index/island mismatch");
        return entry;
      }
      if (value < target) low = mid + 1;
      else high = mid - 1;
    }
    throw new UnknownCenterError(`Unknown center: ${code}`);
  }
  getRoute(origin, destination) {
    const a = this.find(origin),
      b = this.find(destination);
    if (a.islandId !== b.islandId)
      throw new CrossIslandRouteError(
        "Routes between islands are not computed",
      );
    const island = this.islands.get(a.islandId),
      position = a.localIndex * island.count + b.localIndex,
      distance = this.#u32(island.distance + position * 4),
      duration = this.#u32(island.duration + position * 4);
    if (distance === UNREACHABLE || duration === UNREACHABLE)
      throw new UnreachableRouteError("Route is unavailable");
    return { distanceMeters: distance, durationSeconds: duration };
  }
}
