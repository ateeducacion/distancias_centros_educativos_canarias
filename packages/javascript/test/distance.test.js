import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  CrossIslandRouteError,
  DistanceMatrix,
  UnreachableRouteError,
} from "../src/index.js";

const load = (name) => {
  const fixtureUrl = new URL(`../../../data/samples/${name}`, import.meta.url);
  const fixture = fs.readFileSync(fileURLToPath(fixtureUrl));
  return new DistanceMatrix(
    fixture.buffer.slice(
      fixture.byteOffset,
      fixture.byteOffset + fixture.byteLength,
    ),
  );
};

describe("DistanceMatrix", () => {
  for (const [name, major] of [
    ["sample.dat", 3],
    ["sample-v2.dat", 2],
  ]) {
    it(`reads CEDIST0${major} directed distances`, () => {
      const matrix = load(name);
      expect(matrix.formatMajor).toBe(major);
      expect(matrix.getDistance("10000001", "10000002").distanceMeters).toBe(
        1200,
      );
      expect(matrix.getDistance("10000002", "10000001").distanceMeters).toBe(
        1100,
      );
    });
  }

  it("rejects unsupported distances", () => {
    const matrix = load("sample.dat");
    expect(() => matrix.getDistance("10000001", "20000004")).toThrow(
      CrossIslandRouteError,
    );
    expect(() => matrix.getDistance("10000002", "10000009")).toThrow(
      UnreachableRouteError,
    );
  });
});
