export interface LoadOptions {
  dataUrl?: string;
  binaryUrl?: string;
  centersUrl: string;
}

export interface DistanceResult {
  readonly distanceMeters: number;
}

export declare class DistanceMatrix {
  constructor(buffer: ArrayBuffer, centers?: readonly object[]);
  static load(options: LoadOptions): Promise<DistanceMatrix>;
  getDistance(origin: string, destination: string): DistanceResult;
  getRoute(origin: string, destination: string): DistanceResult;
}

export declare const RouteMatrix: typeof DistanceMatrix;
export declare class InvalidFormatError extends Error {}
export declare class UnknownCenterError extends Error {}
export declare class CrossIslandRouteError extends Error {}
export declare class UnreachableRouteError extends Error {}
