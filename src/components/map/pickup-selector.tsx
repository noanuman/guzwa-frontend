"use client";

import { useEffect, useRef, useCallback } from "react";
import { useMap } from "@vis.gl/react-google-maps";

interface PickupSelectorProps {
  routePath: { lat: number; lng: number }[];
  onPickupSelected: (lat: number, lng: number) => void;
}

/**
 * Renders the driver's route on the map as a polyline.
 * When the passenger clicks near the route, snaps to the closest point
 * on the polyline and places a pickup marker there.
 */
export function PickupSelector({ routePath, onPickupSelected }: PickupSelectorProps) {
  const map = useMap();
  const markerRef = useRef<google.maps.Marker | null>(null);
  // Keep callback in a ref so the effect never re-runs when parent re-renders
  const onPickupRef = useRef(onPickupSelected);
  onPickupRef.current = onPickupSelected;
  // Stable ref for routePath to avoid snapToRoute changing
  const routePathRef = useRef(routePath);
  routePathRef.current = routePath;

  const placeMarker = useCallback(
    (pos: { lat: number; lng: number }) => {
      if (!map) return;
      if (markerRef.current) {
        markerRef.current.setPosition(pos);
      } else {
        markerRef.current = new google.maps.Marker({
          map,
          position: pos,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: "#f59e0b",
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 3,
          },
          zIndex: 20,
          title: "Mesto preuzimanja",
        });
      }
    },
    [map]
  );

  // Draw route + attach click handlers — only when map or routePath identity changes
  useEffect(() => {
    if (!map || routePath.length < 2) return;

    const polyline = new google.maps.Polyline({
      map,
      path: routePath.map((p) => ({ lat: p.lat, lng: p.lng })),
      strokeColor: "#10b981",
      strokeWeight: 5,
      strokeOpacity: 0.8,
      zIndex: 10,
      clickable: true,
    });

    // Fit bounds once
    const bounds = new google.maps.LatLngBounds();
    routePath.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, 80);

    const handleClick = (lat: number, lng: number) => {
      const snapped = snapToRoute(routePathRef.current, lat, lng);
      placeMarker(snapped);
      onPickupRef.current(snapped.lat, snapped.lng);
    };

    const polylineListener = polyline.addListener("click", (e: google.maps.PolyMouseEvent) => {
      if (!e.latLng) return;
      handleClick(e.latLng.lat(), e.latLng.lng());
    });

    const mapListener = map.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const snapped = snapToRoute(routePathRef.current, e.latLng.lat(), e.latLng.lng());
      const dist = haversine(e.latLng.lat(), e.latLng.lng(), snapped.lat, snapped.lng);
      if (dist <= 0.5) {
        placeMarker(snapped);
        onPickupRef.current(snapped.lat, snapped.lng);
      }
    });

    return () => {
      polyline.setMap(null);
      google.maps.event.removeListener(polylineListener);
      google.maps.event.removeListener(mapListener);
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, routePath, placeMarker]);

  return null;
}

/* ---- Geometry helpers ---- */

function snapToRoute(
  path: { lat: number; lng: number }[],
  clickLat: number,
  clickLng: number
): { lat: number; lng: number } {
  let bestDist = Infinity;
  let bestPoint = { lat: clickLat, lng: clickLng };

  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    const snapped = closestPointOnSegment(a, b, { lat: clickLat, lng: clickLng });
    const dist = haversine(clickLat, clickLng, snapped.lat, snapped.lng);
    if (dist < bestDist) {
      bestDist = dist;
      bestPoint = snapped;
    }
  }
  return bestPoint;
}

function closestPointOnSegment(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
  p: { lat: number; lng: number }
): { lat: number; lng: number } {
  const dx = b.lng - a.lng;
  const dy = b.lat - a.lat;
  if (dx === 0 && dy === 0) return a;
  let t = ((p.lng - a.lng) * dx + (p.lat - a.lat) * dy) / (dx * dx + dy * dy);
  t = Math.max(0, Math.min(1, t));
  return { lat: a.lat + t * dy, lng: a.lng + t * dx };
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
