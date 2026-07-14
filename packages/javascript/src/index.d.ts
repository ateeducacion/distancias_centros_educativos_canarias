export interface LoadOptions {
  dataUrl: string;
  centersUrl: string;
}

export interface DistanceResult {
  readonly distanceMeters: number;
}

export declare class DistanceMatrix {
  constructor(buffer: ArrayBuffer, centers?: readonly object[]);
  readonly centers: readonly object[];
  static load(options: LoadOptions): Promise<DistanceMatrix>;
  getDistance(origin: string, destination: string): DistanceResult;
}

export declare class InvalidFormatError extends Error {}
export declare class UnknownCenterError extends Error {}
export declare class CrossIslandRouteError extends Error {}
export declare class UnreachableRouteError extends Error {}
