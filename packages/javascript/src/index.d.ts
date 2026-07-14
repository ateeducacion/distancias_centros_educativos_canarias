export interface LoadOptions {
  binaryUrl: string;
  centersUrl: string;
}
export interface RouteResult {
  readonly distanceMeters: number;
  readonly durationSeconds: number;
}
export declare class RouteMatrix {
  constructor(buffer: ArrayBuffer, centers?: readonly object[]);
  static load(options: LoadOptions): Promise<RouteMatrix>;
  getRoute(origin: string, destination: string): RouteResult;
}
export declare class InvalidFormatError extends Error {}
export declare class UnknownCenterError extends Error {}
export declare class CrossIslandRouteError extends Error {}
export declare class UnreachableRouteError extends Error {}
