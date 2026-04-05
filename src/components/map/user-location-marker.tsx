"use client";

import { useEffect, useRef } from "react";
import { useMap } from "@vis.gl/react-google-maps";

export function UserLocationMarker({ pos }: { pos: { lat: number; lng: number }; heading: number | null }) {
  const map = useMap();
  const markerRef = useRef<google.maps.Marker | null>(null);

  // Create marker once when map is ready
  useEffect(() => {
    if (!map) return;

    const marker = new google.maps.Marker({
      map,
      position: pos,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: "#F08D39",
        fillOpacity: 1,
        strokeColor: "#fff",
        strokeWeight: 3,
      },
      zIndex: 999,
      optimized: false,
    });
    markerRef.current = marker;

    return () => {
      marker.setMap(null);
      markerRef.current = null;
    };
    // Only create/destroy when map changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  // Update position
  useEffect(() => {
    markerRef.current?.setPosition(pos);
  }, [pos]);

  return null;
}
