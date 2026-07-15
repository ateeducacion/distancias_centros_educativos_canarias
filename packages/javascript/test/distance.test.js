import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  CrossIslandRouteError,
  DistanceMatrix,
  UnreachableRouteError,
} from "../src/index.js";

const fixtureUrl = new URL(
  "../../../data/samples/sample.dat",
  import.meta.url,
);
const fixture = fs.readFileSync(fileURLToPath(fixtureUrl));
const matrix = new DistanceMatrix(
  fixture.buffer.slice(
    fixture.byteOffset,
    fixture.byteOffset + fixture.byteLength,
  ),
);

describe("DistanceMatrix", () => {
  it("reads CEDIST04 directed distances", () => {
    expect(matrix.getDistance("10000001", "10000002").distanceMeters).toBe(
      1200,
    );
    expect(matrix.getDistance("10000002", "10000001").distanceMeters).toBe(
      1100,
    );
  });

  it("rejects unsupported distances", () => {
    expect(() => matrix.getDistance("10000001", "20000004")).toThrow(
      CrossIslandRouteError,
    );
    expect(() => matrix.getDistance("10000002", "10000009")).toThrow(
      UnreachableRouteError,
    );
  });
});
