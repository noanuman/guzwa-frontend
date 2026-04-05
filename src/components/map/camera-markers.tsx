"use client";

import { useEffect, useRef, useState } from "react";
import { useMap } from "@vis.gl/react-google-maps";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface CameraData {
  id: string;
  name: string;
  link: string;
  lat: number;
  lng: number;
}

export function CameraMarkers({
  visible,
  onCameraClick,
}: {
  visible: boolean;
  onCameraClick: (camera: CameraData) => void;
}) {
  const map = useMap();
  const markersRef = useRef<google.maps.Marker[]>([]);
  const listenersRef = useRef<google.maps.MapsEventListener[]>([]);
  const [cameras, setCameras] = useState<CameraData[]>([]);
  const loadedRef = useRef(false);

  // Load cameras from Firestore when filter is toggled on
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    async function loadCameras() {
      try {
        const snapshot = await getDocs(collection(db, "Kamere"));
        const data: CameraData[] = [];
        snapshot.forEach((doc) => {
          const d = doc.data();
          const link = d.link ?? "";
          // Parse coordinates — try all possible field names
          const coordStr = d.LongLat ?? d.LatLong ?? d.longLat ?? d.latLong ?? d.longlat ?? d.Longlat ?? d.coordinates ?? "";
          if (!coordStr || !link) return;

          const parts = coordStr.split(",").map((s: string) => parseFloat(s.trim()));
          if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return;

          // Determine if it's lat,lng or lng,lat based on Belgrade's range
          // Belgrade: lat ~44.7-44.9, lng ~20.3-20.6
          let lat: number, lng: number;
          if (parts[0] > 40 && parts[0] < 50) {
            lat = parts[0];
            lng = parts[1];
          } else {
            lat = parts[1];
            lng = parts[0];
          }

          data.push({
            id: doc.id,
            name: doc.id,
            link,
            lat,
            lng,
          });
        });
        setCameras(data);
      } catch (err) {
        console.error("Failed to load cameras:", err);
      }
    }

    loadCameras();
  }, [visible]);

  // Create/destroy markers based on visibility
  useEffect(() => {
    if (!map) return;

    // Clean up existing markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    listenersRef.current.forEach((l) => google.maps.event.removeListener(l));
    listenersRef.current = [];

    if (!visible || cameras.length === 0) return;

    // Camera icon SVG
    const cameraSvg = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="%23374151" stroke="white" stroke-width="2"/><path d="M10 12h8a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2z" fill="none" stroke="white" stroke-width="1.5"/><path d="M20 14l3-1.5v7l-3-1.5" fill="none" stroke="white" stroke-width="1.5"/></svg>`)}`;

    for (const cam of cameras) {
      const marker = new google.maps.Marker({
        map,
        position: { lat: cam.lat, lng: cam.lng },
        icon: {
          url: cameraSvg,
          scaledSize: new google.maps.Size(28, 28),
          anchor: new google.maps.Point(14, 14),
        },
        title: cam.name,
        zIndex: 800,
      });

      const listener = marker.addListener("click", () => {
        onCameraClick(cam);
      });

      markersRef.current.push(marker);
      listenersRef.current.push(listener);
    }

    return () => {
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      listenersRef.current.forEach((l) => google.maps.event.removeListener(l));
      listenersRef.current = [];
    };
  }, [map, visible, cameras, onCameraClick]);

  return null;
}

export type { CameraData };
