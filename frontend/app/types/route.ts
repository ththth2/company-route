export interface Coordinates {latitude:number;longitude:number}
export interface Company {name:string;address:string;location:Coordinates|null;routingAvailable:boolean}
export interface RouteResult {
  origin:Coordinates;destination:Coordinates;distanceMeters:number;durationSeconds:number;
  encodedPolyline:string;calculatedAt:string;estimatedArrivalAt:string;
}
