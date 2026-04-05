"use client";

import { ParkingCircle } from "lucide-react";
import type { MapPin } from "./map-pins";

const MARKER_CONFIG: Record<
  MapPin["type"],
  { bg: string; icon: React.ElementType }
> = {
  parking: { bg: "#F08D39", icon: ParkingCircle },
};

interface MapMarkerProps {
  type: MapPin["type"];
}

export function MapMarker({ type }: MapMarkerProps) {
  const { bg, icon: Icon } = MARKER_CONFIG[type];

  return (
    <div
      className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white shadow-md"
      style={{ backgroundColor: bg }}
    >
      <Icon className="h-4 w-4 text-white" />
    </div>
  );
}
