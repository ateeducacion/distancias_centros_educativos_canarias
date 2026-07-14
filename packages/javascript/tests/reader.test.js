import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  RouteMatrix,
  CrossIslandRouteError,
  UnreachableRouteError,
} from "../src/index.js";
const bytes = readFileSync(
  new URL("../../../data/samples/sample.bin", import.meta.url),
);
const matrix = new RouteMatrix(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
);
describe("CEDIST01", () => {
  it("reads directed routes", () => {
    expect(matrix.getRoute("10000001", "10000002").distanceMeters).toBe(1200);
    expect(matrix.getRoute("10000002", "10000001").distanceMeters).toBe(1100);
  });
  it("rejects cross-island and unreachable routes", () => {
    expect(() => matrix.getRoute("10000001", "20000004")).toThrow(
      CrossIslandRouteError,
    );
    expect(() => matrix.getRoute("10000002", "10000009")).toThrow(
      UnreachableRouteError,
    );
  });
});
