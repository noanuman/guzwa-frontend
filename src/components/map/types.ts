export interface PlacePrediction {
  placeId: string;
  mainText: string;
  secondaryText: string;
  distanceKm: string | null;
}

export interface SelectedPlace {
  placeId: string;
  name: string;
  address: string;
}

export interface TransitStep {
  type: "WALKING" | "TRANSIT";
  instruction: string;
  duration: string;
  distance: string;
  path: google.maps.LatLng[];
  lineName?: string;
  lineShortName?: string;
  vehicleType?: string;
  departureStop?: string;
  arrivalStop?: string;
  departureTime?: string;
  arrivalTime?: string;
  numStops?: number;
  lineColor?: string;
  intermediateStops?: string[];
  /** Lat/lng positions for intermediate stops (for marker placement when path is a dense polyline) */
  intermediateStopCoords?: google.maps.LatLng[];
}

export interface TransitRoute {
  duration: string;
  durationSecs: number;
  departureTime: string;
  arrivalTime: string;
  steps: TransitStep[];
  source?: "google" | "bgvoz";
}

export interface RouteInfo {
  origin: { lat: number; lng: number };
  destinationPlaceId: string;
  waypoints?: { lat: number; lng: number; label?: string }[];
}