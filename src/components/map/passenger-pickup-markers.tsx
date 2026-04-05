"use client";

import { useEffect, useRef } from "react";
import { useMap } from "@vis.gl/react-google-maps";
import type { JoinRequest } from "@/lib/rides-store";

interface PassengerPickupMarkersProps {
  /** Accepted join requests with pickup coordinates */
  pickupRequests: JoinRequest[];
}

/**
 * Renders pickup point markers on the map for each accepted passenger.
 * Shows an amber pin with the passenger's name.
 */
export function PassengerPickupMarkers({ pickupRequests }: PassengerPickupMarkersProps) {
  const map = useMap();
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowsRef = useRef<google.maps.InfoWindow[]>([]);

  useEffect(() => {
    if (!map) return;

    // Clear previous markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    infoWindowsRef.current.forEach((iw) => iw.close());
    infoWindowsRef.current = [];

    for (const req of pickupRequests) {
      if (!req.pickupLat || !req.pickupLng) continue;

      const marker = new google.maps.Marker({
        map,
        position: { lat: req.pickupLat, lng: req.pickupLng },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: "#f59e0b",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 3,
        },
        zIndex: 25,
        title: req.name,
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `<div style="font-size:12px;font-weight:600;padding:4px 10px;white-space:nowrap;">${req.name}</div>`,
        disableAutoPan: true,
      });

      // Auto-open so driver sees the name
      infoWindow.open(map, marker);

      marker.addListener("click", () => {
        infoWindow.open(map, marker);
      });

      markersRef.current.push(marker);
      infoWindowsRef.current.push(infoWindow);
    }

    return () => {
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      infoWindowsRef.current.forEach((iw) => iw.close());
      infoWindowsRef.current = [];
    };
  }, [map, pickupRequests]);

  return null;
}
