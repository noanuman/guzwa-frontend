"use client";

import { useEffect, useRef } from "react";
import { useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { createDestinationFlag } from "./destination-flag";
import type { RouteInfo } from "./types";

// Find the closest point index on a path to a given position
function findClosestPointIndex(
  path: google.maps.LatLng[],
  pos: { lat: number; lng: number }
): number {
  let minDist = Infinity;
  let closestIdx = 0;
  const p = new google.maps.LatLng(pos.lat, pos.lng);
  for (let i = 0; i < path.length; i++) {
    const d = google.maps.geometry.spherical.computeDistanceBetween(p, path[i]);
    if (d < minDist) {
      minDist = d;
      closestIdx = i;
    }
  }
  return closestIdx;
}

interface StepSegment {
  path: google.maps.LatLng[];
  color: string;
  startIdx: number;
  endIdx: number;
}

export function LiveNavigation({
  route,
  userPos,
  heading,
  followUser,
  onDurationUpdate,
  onRouteReady,
}: {
  route: RouteInfo;
  userPos: { lat: number; lng: number } | null;
  followUser: boolean;
  heading: number | null;
  onDurationUpdate: (duration: string, secs: number) => void;
  onRouteReady?: (path: { lat: number; lng: number }[]) => void;
}) {
  const map = useMap();
  const routesLib = useMapsLibrary("routes");
  const geometryLib = useMapsLibrary("geometry");
  const onDurationRef = useRef(onDurationUpdate);
  onDurationRef.current = onDurationUpdate;
  const onRouteReadyRef = useRef(onRouteReady);
  onRouteReadyRef.current = onRouteReady;

  const routePathRef = useRef<google.maps.LatLng[]>([]);
  const stepsRef = useRef<StepSegment[]>([]);
  const totalDurationRef = useRef<number>(0);
  const totalPointsRef = useRef<number>(0);
  const segmentLinesRef = useRef<google.maps.Polyline[]>([]);
  const traveledLineRef = useRef<google.maps.Polyline | null>(null);
  const destMarkerRef = useRef<google.maps.Marker | null>(null);
  const waypointMarkersRef = useRef<{ marker: google.maps.Marker; lat: number; lng: number }[]>([]);
  const initialFitDone = useRef(false);

  // Track all map objects for guaranteed cleanup
  const mapObjectsRef = useRef<{ setMap: (m: google.maps.Map | null) => void }[]>([]);

  // Fetch the route once
  useEffect(() => {
    if (!map || !routesLib) return;
    initialFitDone.current = false;

    // Clean up any previous objects immediately
    mapObjectsRef.current.forEach((o) => o.setMap(null));
    mapObjectsRef.current = [];
    segmentLinesRef.current = [];
    traveledLineRef.current = null;
    destMarkerRef.current = null;

    let disposed = false;

    const directionsService = new google.maps.DirectionsService();
    const waypointsList = (route.waypoints ?? []).map((wp) => ({
      location: new google.maps.LatLng(wp.lat, wp.lng),
      stopover: true,
    }));
    directionsService.route(
      {
        origin: route.origin,
        destination: { placeId: route.destinationPlaceId },
        waypoints: waypointsList,
        optimizeWaypoints: true,
        travelMode: google.maps.TravelMode.DRIVING,
        drivingOptions: {
          departureTime: new Date(),
          trafficModel: google.maps.TrafficModel.BEST_GUESS,
        },
      },
      (result, status) => {
        if (disposed || status !== "OK" || !result) return;

        const path: google.maps.LatLng[] = [];
        const steps: StepSegment[] = [];
        const legs = result.routes[0].legs;

        let totalSeconds = 0;
        for (const leg of legs) {
          totalSeconds += (leg.duration_in_traffic?.value ?? leg.duration?.value ?? 0);
        }
        totalDurationRef.current = totalSeconds;
        onDurationRef.current(legs[0]?.duration_in_traffic?.text ?? legs[0]?.duration?.text ?? "", totalSeconds);

        // Build segments per step with traffic color
        let globalIdx = 0;
        for (const leg of legs) {
          for (const step of leg.steps) {
            const startIdx = globalIdx;
            const stepPath: google.maps.LatLng[] = [];
            for (const pt of step.path) {
              path.push(pt);
              stepPath.push(pt);
              globalIdx++;
            }
            // Speed in km/h — thresholds favor green
            const distM = step.distance?.value ?? 0;
            const durS = step.duration?.value ?? 1;
            const speedKmh = (distM / 1000) / (durS / 3600);

            let color: string;
            if (speedKmh >= 25) color = "#3b82f6";        // blue — fast
            else if (speedKmh >= 15) color = "#6d28d9";   // deep purple — moderate
            else if (speedKmh >= 8) color = "#dc2626";    // red — slow
            else color = "#991b1b";                        // dark red — crawling

            steps.push({ path: stepPath, color, startIdx, endIdx: globalIdx - 1 });
          }
        }
        routePathRef.current = path;
        totalPointsRef.current = path.length;

        // Expose path for ride sharing
        if (onRouteReadyRef.current) {
          // Sample every 5th point to keep payload manageable
          const sampled = path.filter((_, i) => i % 5 === 0 || i === path.length - 1);
          onRouteReadyRef.current(sampled.map((p) => ({ lat: p.lat(), lng: p.lng() })));
        }
        stepsRef.current = steps;

        // Draw traffic-colored segments
        for (const seg of steps) {
          const line = new google.maps.Polyline({
            map,
            path: seg.path,
            strokeColor: seg.color,
            strokeWeight: 2,
            strokeOpacity: 0.9,
            zIndex: 2,
          });
          segmentLinesRef.current.push(line);
          mapObjectsRef.current.push(line);
        }

        // Traveled overlay (faded grey)
        const traveledLine = new google.maps.Polyline({
          map,
          path: [],
          strokeColor: "#ccc",
          strokeWeight: 2,
          strokeOpacity: 0.5,
          zIndex: 3,
        });
        traveledLineRef.current = traveledLine;
        mapObjectsRef.current.push(traveledLine);

        // Destination marker — guzwa flag
        const lastPt = path[path.length - 1];
        const destMarker = createDestinationFlag(map, lastPt);
        destMarkerRef.current = destMarker;
        mapObjectsRef.current.push(destMarker);

        // Pitstop markers for waypoints
        waypointMarkersRef.current = [];
        for (const wp of route.waypoints ?? []) {
          const marker = new google.maps.Marker({
            map,
            position: { lat: wp.lat, lng: wp.lng },
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: "#f59e0b",
              fillOpacity: 1,
              strokeColor: "#fff",
              strokeWeight: 3,
            },
            zIndex: 15,
          });
          mapObjectsRef.current.push(marker);
          waypointMarkersRef.current.push({ marker, lat: wp.lat, lng: wp.lng });
        }

        // Fit bounds
        const bounds = new google.maps.LatLngBounds();
        path.forEach((p) => bounds.extend(p));
        map.fitBounds(bounds, 80);
      }
    );

    return () => {
      disposed = true;
      mapObjectsRef.current.forEach((o) => o.setMap(null));
      mapObjectsRef.current = [];
      segmentLinesRef.current = [];
      traveledLineRef.current = null;
      destMarkerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, routesLib, route]);

  // Update route on position change
  useEffect(() => {
    if (!map || !userPos || !geometryLib || routePathRef.current.length === 0) return;

    const path = routePathRef.current;
    const idx = findClosestPointIndex(path, userPos);

    // Remove waypoint markers when driver passes within 100m
    for (const wp of waypointMarkersRef.current) {
      if (!wp.marker.getMap()) continue;
      const dist = google.maps.geometry.spherical.computeDistanceBetween(
        new google.maps.LatLng(userPos.lat, userPos.lng),
        new google.maps.LatLng(wp.lat, wp.lng)
      );
      if (dist < 100) {
        wp.marker.setMap(null);
      }
    }

    if (followUser) {
      // Active navigation — delete traversed segments, show only remaining
      traveledLineRef.current?.setPath([]);

      // Update each segment polyline to only show remaining portion
      for (const seg of stepsRef.current) {
        const segLine = segmentLinesRef.current[stepsRef.current.indexOf(seg)];
        if (!segLine) continue;

        if (idx >= seg.endIdx) {
          // Fully traversed — hide
          segLine.setPath([]);
        } else if (idx > seg.startIdx) {
          // Partially traversed — trim
          const offset = idx - seg.startIdx;
          segLine.setPath(seg.path.slice(offset));
        }
        // else: not yet reached — keep full path
      }

      // Follow user
      if (initialFitDone.current) {
        map.panTo(userPos);
      } else {
        initialFitDone.current = true;
        map.setZoom(17);
        map.panTo(userPos);
      }
    } else {
      // Preview mode — grey overlay on traveled portion
      traveledLineRef.current?.setPath(path.slice(0, idx + 1));
    }

    // Estimate remaining duration
    const totalPts = totalPointsRef.current;
    if (totalPts > 0 && totalDurationRef.current > 0) {
      const remaining = path.length - idx;
      const fraction = remaining / totalPts;
      const remainingSec = Math.round(totalDurationRef.current * fraction);
      const mins = Math.ceil(remainingSec / 60);
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      const label = h > 0 ? `${h} h ${m} min` : `${m} min`;
      onDurationRef.current(label, remainingSec);
    }
  }, [map, userPos, geometryLib, followUser]);

  return null;
}
