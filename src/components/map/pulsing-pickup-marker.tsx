"use client";

import { useEffect, useRef } from "react";
import { useMap } from "@vis.gl/react-google-maps";

interface PulsingPickupMarkerProps {
  lat: number;
  lng: number;
}

export function PulsingPickupMarker({ lat, lng }: PulsingPickupMarkerProps) {
  const map = useMap();
  const overlayRef = useRef<google.maps.OverlayView | null>(null);

  useEffect(() => {
    if (!map) return;

    const overlay = new google.maps.OverlayView();

    overlay.onAdd = function () {
      const div = document.createElement("div");
      div.style.position = "absolute";
      div.style.width = "0";
      div.style.height = "0";
      div.innerHTML = `
        <div style="position:relative;width:0;height:0;">
          <div style="
            position:absolute;
            left:-20px;top:-20px;
            width:40px;height:40px;
            border-radius:50%;
            background:rgba(59,130,246,0.25);
            animation:pulse-ring 1.5s ease-out infinite;
          "></div>
          <div style="
            position:absolute;
            left:-8px;top:-8px;
            width:16px;height:16px;
            border-radius:50%;
            background:#3b82f6;
            border:3px solid white;
            box-shadow:0 2px 8px rgba(0,0,0,0.3);
          "></div>
        </div>
      `;
      (this as google.maps.OverlayView & { div: HTMLDivElement }).div = div;
      this.getPanes()?.overlayMouseTarget.appendChild(div);
    };

    overlay.draw = function () {
      const proj = this.getProjection();
      if (!proj) return;
      const pos = proj.fromLatLngToDivPixel(new google.maps.LatLng(lat, lng));
      if (!pos) return;
      const div = (this as google.maps.OverlayView & { div: HTMLDivElement }).div;
      div.style.left = pos.x + "px";
      div.style.top = pos.y + "px";
    };

    overlay.onRemove = function () {
      const div = (this as google.maps.OverlayView & { div: HTMLDivElement }).div;
      div.parentNode?.removeChild(div);
    };

    overlay.setMap(map);
    overlayRef.current = overlay;

    // Inject pulse animation if not present
    if (!document.getElementById("pulse-ring-style")) {
      const style = document.createElement("style");
      style.id = "pulse-ring-style";
      style.textContent = `
        @keyframes pulse-ring {
          0% { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    return () => {
      overlay.setMap(null);
      overlayRef.current = null;
    };
  }, [map, lat, lng]);

  return null;
}
