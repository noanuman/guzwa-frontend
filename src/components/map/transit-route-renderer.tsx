"use client";

import { useEffect, useRef } from "react";
import { useMap } from "@vis.gl/react-google-maps";
import { createDestinationFlag } from "./destination-flag";
import type { TransitRoute } from "./types";

export function TransitRouteRenderer({ route }: { route: TransitRoute }) {
  const map = useMap();
  const mapObjectsRef = useRef<{ setMap: (m: google.maps.Map | null) => void }[]>([]);
  const listenersRef = useRef<google.maps.MapsEventListener[]>([]);

  useEffect(() => {
    if (!map) return;

    mapObjectsRef.current.forEach((o) => o.setMap(null));
    mapObjectsRef.current = [];
    listenersRef.current.forEach((l) => google.maps.event.removeListener(l));
    listenersRef.current = [];

    const bounds = new google.maps.LatLngBounds();
    let activeInfoWindow: google.maps.InfoWindow | null = null;

    // Draw transit lines first (lower z), walking on top
    route.steps.forEach((step) => {
      if (step.path.length === 0) return;
      step.path.forEach((p) => bounds.extend(p));

      if (step.type === "TRANSIT") {
        const color = step.lineColor || "#4285F4";
        const line = new google.maps.Polyline({
          map,
          path: step.path,
          strokeColor: color,
          strokeWeight: 4,
          strokeOpacity: 0.85,
          zIndex: 2,
        });
        mapObjectsRef.current.push(line);

        // Departure + arrival: square stop markers
        const stopIcon = (c: string) => ({
          path: "M -4,-4 L 4,-4 L 4,4 L -4,4 Z",
          scale: 1,
          fillColor: c,
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2,
          anchor: new google.maps.Point(0, 0),
        });

        const makeStopMarker = (pos: google.maps.LatLng, name: string, color: string) => {
          const marker = new google.maps.Marker({
            map,
            position: pos,
            icon: stopIcon(color),
            zIndex: 6,
          });
          mapObjectsRef.current.push(marker);

          // Click to show name
          const infoWindow = new google.maps.InfoWindow({
            content: `<div style="font-size:11px;font-weight:500;padding:3px 8px;white-space:nowrap;color:#6b7280;">${name}</div>`,
            disableAutoPan: true,
          });

          const listener = marker.addListener("click", () => {
            activeInfoWindow?.close();
            infoWindow.open(map, marker);
            activeInfoWindow = infoWindow;
          });
          listenersRef.current.push(listener);
          mapObjectsRef.current.push({ setMap: () => infoWindow.close() });
        };

        if (step.path.length > 0 && step.departureStop) {
          makeStopMarker(step.path[0], step.departureStop, color);
        }
        if (step.path.length > 1 && step.arrivalStop) {
          makeStopMarker(step.path[step.path.length - 1], step.arrivalStop, color);
        }

        // Intermediate stops — small circles
        // Use explicit station coordinates if available (for train routes with dense polyline paths)
        if (step.intermediateStops && step.intermediateStops.length > 0 && step.intermediateStopCoords && step.intermediateStopCoords.length > 0) {
          for (let i = 0; i < step.intermediateStops.length; i++) {
            const stopName = step.intermediateStops[i];
            const pos = step.intermediateStopCoords[i];
            if (!pos) continue;
            const dot = new google.maps.Marker({
              map,
              position: pos,
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 3,
                fillColor: "#fff",
                fillOpacity: 1,
                strokeColor: color,
                strokeWeight: 1.5,
              },
              zIndex: 5,
            });
            mapObjectsRef.current.push(dot);
            if (stopName) {
              const iw = new google.maps.InfoWindow({
                content: `<div style="font-size:11px;font-weight:500;padding:3px 8px;white-space:nowrap;color:#6b7280;">${stopName}</div>`,
                disableAutoPan: true,
              });
              const l = dot.addListener("click", () => { activeInfoWindow?.close(); iw.open(map, dot); activeInfoWindow = iw; });
              listenersRef.current.push(l);
              mapObjectsRef.current.push({ setMap: () => iw.close() });
            }
          }
        } else if (step.intermediateStops && step.intermediateStops.length > 0 && step.path.length > 2) {
          // Fallback: path points map 1:1 to stops (no dense polyline)
          for (let i = 1; i < step.path.length - 1 && i - 1 < step.intermediateStops.length; i++) {
            const stopName = step.intermediateStops[i - 1] ?? "";
            const dot = new google.maps.Marker({
              map,
              position: step.path[i],
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 3,
                fillColor: "#fff",
                fillOpacity: 1,
                strokeColor: color,
                strokeWeight: 1.5,
              },
              zIndex: 5,
            });
            mapObjectsRef.current.push(dot);
            if (stopName) {
              const iw = new google.maps.InfoWindow({
                content: `<div style="font-size:11px;font-weight:500;padding:3px 8px;white-space:nowrap;color:#6b7280;">${stopName}</div>`,
                disableAutoPan: true,
              });
              const l = dot.addListener("click", () => { activeInfoWindow?.close(); iw.open(map, dot); activeInfoWindow = iw; });
              listenersRef.current.push(l);
              mapObjectsRef.current.push({ setMap: () => iw.close() });
            }
          }
        } else if (step.numStops && step.numStops > 1 && step.path.length > 2) {
          const interval = Math.floor(step.path.length / step.numStops);
          for (let i = interval; i < step.path.length - interval; i += interval) {
            const dot = new google.maps.Marker({
              map,
              position: step.path[i],
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 2.5,
                fillColor: "#fff",
                fillOpacity: 1,
                strokeColor: color,
                strokeWeight: 1.5,
              },
              zIndex: 5,
            });
            mapObjectsRef.current.push(dot);
          }
        }
      }
    });

    // Walking lines on top
    route.steps.forEach((step) => {
      if (step.type !== "WALKING" || step.path.length === 0) return;

      const line = new google.maps.Polyline({
        map,
        path: step.path,
        strokeColor: "#aaa",
        strokeWeight: 3,
        strokeOpacity: 0,
        zIndex: 4,
        icons: [{
          icon: { path: "M 0,-1 0,1", strokeOpacity: 0.5, strokeWeight: 3, scale: 1.5 },
          offset: "0",
          repeat: "10px",
        }],
      });
      mapObjectsRef.current.push(line);
    });

    // Destination flag — guzwa flag
    const allPts = route.steps.flatMap((s) => s.path);
    if (allPts.length > 0) {
      const flag = createDestinationFlag(map, allPts[allPts.length - 1]);
      mapObjectsRef.current.push(flag);
    }

    // Close info window on map click
    const mapClickListener = map.addListener("click", () => {
      activeInfoWindow?.close();
      activeInfoWindow = null;
    });
    listenersRef.current.push(mapClickListener);

    map.fitBounds(bounds, 60);

    return () => {
      mapObjectsRef.current.forEach((o) => o.setMap(null));
      mapObjectsRef.current = [];
      listenersRef.current.forEach((l) => google.maps.event.removeListener(l));
      listenersRef.current = [];
    };
  }, [map, route]);

  return null;
}
