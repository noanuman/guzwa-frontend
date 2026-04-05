import { ParkingCircle, TriangleAlert, Ban, Camera } from "lucide-react";

export const BELGRADE = { lat: 44.8076, lng: 20.4633 };

export const FILTERS = [
  { id: "parking", label: "Parking", icon: ParkingCircle },
  { id: "problems", label: "Problemi na putu", icon: TriangleAlert },
  { id: "blocked", label: "Blokirane ulice", icon: Ban },
  { id: "cameras", label: "Kamere", icon: Camera },
];
