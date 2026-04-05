"use client";

import { useEffect, useRef } from "react";
import { useMap } from "@vis.gl/react-google-maps";

interface ReportPinDropProps {
  active: boolean;
  pinPlaced: boolean;
  onPinDrop: (lat: number, lng: number) => void;
}

export function ReportPinDrop({ active, pinPlaced, onPinDrop }: ReportPinDropProps) {
  const map = useMap();
  const markerRef = useRef<google.maps.Marker | null>(null);

  // Clean up marker only when fully done (not active AND no pin placed)
  useEffect(() => {
    if (!active && !pinPlaced) {
      markerRef.current?.setMap(null);
      markerRef.current = null;
    }
  }, [active, pinPlaced]);

  useEffect(() => {
    if (!map || !active || pinPlaced) {
      if (map) map.setOptions({ draggableCursor: "" });
      return;
    }

    // Change cursor
    map.setOptions({ draggableCursor: "crosshair" });

    const listener = map.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();

      // Show preview marker
      if (markerRef.current) {
        markerRef.current.setPosition(e.latLng);
      } else {
        const iconSvg = `data:image/svg+xml,${encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
            <polygon points="16,4 30,28 2,28" fill="#f59e0b" stroke="white" stroke-width="2" stroke-linejoin="round"/>
            <text x="16" y="24" text-anchor="middle" font-size="14" font-weight="bold" fill="white">!</text>
          </svg>
        `)}`;
        markerRef.current = new google.maps.Marker({
          map,
          position: e.latLng,
          icon: {
            url: iconSvg,
            scaledSize: new google.maps.Size(36, 36),
            anchor: new google.maps.Point(18, 36),
          },
          zIndex: 1000,
          animation: google.maps.Animation.DROP,
        });
      }

      onPinDrop(lat, lng);
    });

    return () => {
      google.maps.event.removeListener(listener);
      map.setOptions({ draggableCursor: "" });
      markerRef.current?.setMap(null);
      markerRef.current = null;
    };
  }, [map, active, onPinDrop]);

  return null;
}
