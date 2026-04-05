"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMap } from "@vis.gl/react-google-maps";

interface OverlayMarkerProps {
  position: { lat: number; lng: number };
  onClick?: () => void;
  children: React.ReactNode;
}

export function OverlayMarker({
  position,
  onClick,
  children,
}: OverlayMarkerProps) {
  const map = useMap();
  const overlayRef = useRef<google.maps.OverlayView | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!map) return;

    const container = document.createElement("div");
    container.style.position = "absolute";
    container.style.cursor = "pointer";
    container.style.transform = "translate(-50%, -100%)";
    containerRef.current = container;

    class Overlay extends google.maps.OverlayView {
      onAdd() {
        const panes = this.getPanes();
        panes?.overlayMouseTarget.appendChild(container);
        setReady(true);
      }
      draw() {
        const projection = this.getProjection();
        if (!projection) return;
        const point = projection.fromLatLngToDivPixel(
          new google.maps.LatLng(position.lat, position.lng)
        );
        if (!point) return;
        container.style.left = `${point.x}px`;
        container.style.top = `${point.y}px`;
      }
      onRemove() {
        container.remove();
        setReady(false);
      }
    }

    const overlay = new Overlay();
    overlay.setMap(map);
    overlayRef.current = overlay;

    return () => {
      overlay.setMap(null);
    };
  }, [map, position.lat, position.lng]);

  if (!ready || !containerRef.current) return null;

  return createPortal(
    <div onClick={onClick}>{children}</div>,
    containerRef.current
  );
}
