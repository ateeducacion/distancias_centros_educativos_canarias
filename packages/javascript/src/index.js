// SPDX-License-Identifier: MIT
const MAGIC = "CEDIST04";
const MAJOR = 4;
const HEADER = 64;
const INDEX = 12;
const DIRECTORY = 16;
const CELL_SIZE = 2;
const DISTANCE_UNIT_METERS = 10;
const UNREACHABLE = 0xffff;

export class InvalidFormatError extends Error {}
export class UnknownCenterError extends Error {}
export class CrossIslandRouteError extends Error {}
export class UnreachableRouteError extends Error {}

const ascii = (view, start, length) =>
  String.fromCharCode(
    ...new Uint8Array(view.buffer, view.byteOffset + start, length),
  );

export class DistanceMatrix {
  constructor(buffer, centers = []) {
    this.buffer = buffer;
    this.view = new DataView(buffer);
    this.centers = centers;
    this.#parse();
  }

  static async load({ dataUrl, centersUrl }) {
    if (!dataUrl || !centersUrl) {
      throw new TypeError("dataUrl and centersUrl are required");
    }
    const [data, centers] = await Promise.all([
      fetch(dataUrl),
      fetch(centersUrl),
    ]);
    if (!data.ok || !centers.ok) {
      throw new Error("Unable to load distance matrix artifacts");
    }
    return new DistanceMatrix(await data.arrayBuffer(), await centers.json());
  }

  #u8(offset) {
    this.#bounds(offset, 1);
    return this.view.getUint8(offset);
  }

  #u16(offset) {
    this.#bounds(offset, 2);
    return this.view.getUint16(offset, true);
  }

  #u32(offset) {
    this.#bounds(offset, 4);
    return this.view.getUint32(offset, true);
  }

  #u64(offset) {
    this.#bounds(offset, 8);
    const value = this.view.getBigUint64(offset, true);
    if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new InvalidFormatError("Offset overflow");
    }
    return Number(value);
  }

  #bounds(offset, length) {
    if (
      !Number.isSafeInteger(offset) ||
      offset < 0 ||
      offset > this.buffer.byteLength - length
    ) {
      throw new InvalidFormatError("Truncated or out-of-range read");
    }
  }

  #parse() {
    if (this.buffer.byteLength < HEADER) {
      throw new InvalidFormatError("Truncated file");
    }
    if (ascii(this.view, 0, 8) !== MAGIC || this.#u16(8) !== MAJOR) {
      throw new InvalidFormatError("Expected CEDIST04 format");
    }

    if (
      this.#u32(12) !== HEADER ||
      this.#u32(16) !== 0 ||
      this.#u16(22) !== 0
    ) {
      throw new InvalidFormatError("Invalid header");
    }
    for (let index = 52; index < HEADER; index += 1) {
      if (this.view.getUint8(index) !== 0) {
        throw new InvalidFormatError("Reserved header bytes must be zero");
      }
    }

    this.centerCount = this.#u32(24);
    this.indexOffset = this.#u64(28);
    const directoryOffset = this.#u64(36);
    const declaredSize = this.#u64(44);
    if (
      declaredSize !== this.buffer.byteLength ||
      this.indexOffset !== HEADER ||
      directoryOffset !== HEADER + this.centerCount * INDEX
    ) {
      throw new InvalidFormatError("Invalid offsets");
    }

    this.islands = new Map();
    const islandCount = this.#u16(20);
    let expectedOffset = directoryOffset + islandCount * DIRECTORY;
    for (let index = 0; index < islandCount; index += 1) {
      const offset = directoryOffset + index * DIRECTORY;
      const islandId = this.view.getUint8(offset);
      const count = this.#u32(offset + 4);
      const distanceOffset = this.#u64(offset + 8);
      const matrixEnd = distanceOffset + count * count * CELL_SIZE;
      if (
        this.view.getUint8(offset + 1) ||
        this.view.getUint8(offset + 2) ||
        this.view.getUint8(offset + 3) ||
        distanceOffset !== expectedOffset ||
        matrixEnd > declaredSize
      ) {
        throw new InvalidFormatError("Invalid island directory");
      }
      this.islands.set(islandId, { count, distanceOffset });
      expectedOffset = matrixEnd;
    }
    if (expectedOffset !== declaredSize) {
      throw new InvalidFormatError("Unexpected trailing data");
    }
  }

  #code(code) {
    if (typeof code !== "string" || !/^\d{8}$/.test(code)) {
      throw new UnknownCenterError(`Invalid location code: ${code}`);
    }
    const value = Number(code);
    if (value > 0xffffffff) {
      throw new UnknownCenterError("Location code exceeds uint32");
    }
    return value;
  }

  find(code) {
    const target = this.#code(code);
    let low = 0;
    let high = this.centerCount - 1;
    while (low <= high) {
      const middle = Math.floor((low + high) / 2);
      const offset = this.indexOffset + middle * INDEX;
      const value = this.#u32(offset);
      if (value === target) {
        const entry = {
          code,
          islandId: this.view.getUint8(offset + 4),
          localIndex: this.#u16(offset + 6),
          metadataIndex: this.#u32(offset + 8),
        };
        const island = this.islands.get(entry.islandId);
        if (!island || entry.localIndex >= island.count) {
          throw new InvalidFormatError("Index/island mismatch");
        }
        return entry;
      }
      if (value < target) low = middle + 1;
      else high = middle - 1;
    }
    throw new UnknownCenterError(`Unknown location: ${code}`);
  }

  getDistance(origin, destination) {
    const source = this.find(origin);
    const target = this.find(destination);
    if (source.islandId !== target.islandId) {
      throw new CrossIslandRouteError(
        "Distances between islands are not computed",
      );
    }
    const island = this.islands.get(source.islandId);
    const count = island.count;
    const position = source.localIndex * count + target.localIndex;
    // Byte-plane layout: low bytes then high bytes within the island block.
    const low = this.#u8(island.distanceOffset + position);
    const high = this.#u8(island.distanceOffset + count * count + position);
    const stored = low | (high << 8);
    if (stored === UNREACHABLE) {
      throw new UnreachableRouteError("Distance is unavailable");
    }
    return { distanceMeters: stored * DISTANCE_UNIT_METERS };
  }
}
