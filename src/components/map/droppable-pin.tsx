"use client";

import { useEffect, useRef } from "react";
import { useMap } from "@vis.gl/react-google-maps";
import type { SelectedPlace } from "./types";

export function DroppablePin({ onPlaceSelect, enabled }: { onPlaceSelect: (place: SelectedPlace) => void; enabled: boolean }) {
  const map = useMap();
  const markerRef = useRef<google.maps.Marker | null>(null);

  useEffect(() => {
    if (!map || !enabled) return;

    const listener = map.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;

      const pos = e.latLng;

      // Drop pin marker
      if (markerRef.current) {
        markerRef.current.setPosition(pos);
      } else {
        markerRef.current = new google.maps.Marker({
          map,
          position: pos,
          icon: {
            path: "M12 0C7.03 0 3 4.03 3 9c0 6.75 9 15 9 15s9-8.25 9-15c0-4.97-4.03-9-9-9zm0 12.75c-2.07 0-3.75-1.68-3.75-3.75S9.93 5.25 12 5.25s3.75 1.68 3.75 3.75-1.68 3.75-3.75 3.75z",
            fillColor: "#F08D39",
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 1.5,
            scale: 1.5,
            anchor: new google.maps.Point(12, 24),
          },
          zIndex: 900,
          animation: google.maps.Animation.DROP,
        });
      }

      // Reverse geocode
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: pos }, (results, status) => {
        if (status === "OK" && results?.[0]) {
          const result = results[0];
          onPlaceSelect({
            placeId: result.place_id,
            name: result.formatted_address.split(",")[0],
            address: result.formatted_address,
          });
        } else {
          onPlaceSelect({
            placeId: `${pos.lat()},${pos.lng()}`,
            name: `${pos.lat().toFixed(5)}, ${pos.lng().toFixed(5)}`,
            address: "Označena lokacija",
          });
        }
      });
    });

    return () => {
      google.maps.event.removeListener(listener);
      markerRef.current?.setMap(null);
      markerRef.current = null;
    };
  }, [map, enabled, onPlaceSelect]);

  return null;
}
