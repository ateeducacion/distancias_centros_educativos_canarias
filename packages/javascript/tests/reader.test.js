import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  CrossIslandRouteError,
  DistanceMatrix,
  UnreachableRouteError,
} from "../src/index.js";

const bytes = readFileSync(
  new URL("../../../data/samples/sample.dat", import.meta.url),
);
const matrix = new DistanceMatrix(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
);

describe("CEDIST02", () => {
  it("reads directed distances", () => {
    expect(matrix.getDistance("10000001", "10000002").distanceMeters).toBe(
      1200,
    );
    expect(matrix.getDistance("10000002", "10000001").distanceMeters).toBe(
      1100,
    );
  });

  it("rejects cross-island and unreachable distances", () => {
    expect(() => matrix.getDistance("10000001", "20000004")).toThrow(
      CrossIslandRouteError,
    );
    expect(() => matrix.getDistance("10000002", "10000009")).toThrow(
      UnreachableRouteError,
    );
  });
});
