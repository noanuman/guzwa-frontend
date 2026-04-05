"use client";

import { useEffect, useRef, useState } from "react";
import { useMap } from "@vis.gl/react-google-maps";
import {
  subscribeToParkingSpots,
  reserveParkingSpot,
  removeParkingSpot,
  type ParkingSpot,
} from "@/lib/parking-store";
import { useAuth } from "@/lib/auth-context";

export function ParkingMarkers({ visible }: { visible: boolean }) {
  const map = useMap();
  const { user } = useAuth();
  const markersRef = useRef<google.maps.Marker[]>([]);
  const listenersRef = useRef<google.maps.MapsEventListener[]>([]);
  const infoRef = useRef<google.maps.InfoWindow | null>(null);
  const [spots, setSpots] = useState<ParkingSpot[]>([]);

  useEffect(() => {
    if (!visible) return;
    const unsub = subscribeToParkingSpots(setSpots);
    return unsub;
  }, [visible]);

  useEffect(() => {
    if (!map) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    listenersRef.current.forEach((l) => google.maps.event.removeListener(l));
    listenersRef.current = [];
    infoRef.current?.close();

    if (!visible || spots.length === 0) return;

    const uid = user?.uid ?? "";

    for (const spot of spots) {
      const isOwner = spot.ownerId === uid;
      const isReserved = !!spot.reservedBy;
      const isReservedByMe = spot.reservedBy === uid;

      const iconColor = isReserved ? "#6b7280" : "#3b82f6";
      const iconSvg = `data:image/svg+xml,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="38" viewBox="0 0 32 38">
          <path d="M16 0C7.2 0 0 7.2 0 16c0 12 16 22 16 22s16-10 16-22C32 7.2 24.8 0 16 0z" fill="${iconColor}" stroke="white" stroke-width="2"/>
          <text x="16" y="21" text-anchor="middle" font-size="16" font-weight="bold" fill="white" font-family="system-ui">P</text>
        </svg>
      `)}`;

      const marker = new google.maps.Marker({
        map,
        position: { lat: spot.lat, lng: spot.lng },
        icon: {
          url: iconSvg,
          scaledSize: new google.maps.Size(28, 34),
          anchor: new google.maps.Point(14, 34),
        },
        zIndex: 800,
      });

      const listener = marker.addListener("click", () => {
        infoRef.current?.close();

        const statusHtml = isReserved
          ? `<span style="background:#6b7280;color:white;padding:1px 6px;border-radius:9px;font-size:10px;">Rezervisano${isReservedByMe ? " (ti)" : ""}</span>`
          : `<span style="background:#3b82f6;color:white;padding:1px 6px;border-radius:9px;font-size:10px;">Slobodno ${spot.availableFrom} - ${spot.availableUntil}</span>`;

        let actionsHtml = "";
        if (isOwner) {
          actionsHtml = `<button id="remove-${spot.id}" style="width:100%;margin-top:6px;padding:6px;background:#dc2626;color:white;border:none;border-radius:6px;font-size:11px;cursor:pointer;">Ukloni mesto</button>`;
        } else if (!isReserved && uid) {
          actionsHtml = `<button id="reserve-${spot.id}" style="width:100%;margin-top:6px;padding:6px;background:#3b82f6;color:white;border:none;border-radius:6px;font-size:11px;cursor:pointer;">Rezerviši (3 boda)</button>`;
        }

        const phoneHtml = spot.phone
          ? ` · <a href="tel:${spot.phone}" style="color:#3b82f6;text-decoration:none;">📞 ${spot.phone}</a>`
          : "";

        const iw = new google.maps.InfoWindow({
          content: `
            <div style="min-width:200px;max-width:260px;font-family:system-ui;">
              <p style="font-size:14px;font-weight:600;color:#111827;margin:0 0 8px;padding-right:28px;">${spot.description}</p>
              <img src="/images/parking/${spot.id}.png" style="width:100%;height:110px;object-fit:cover;border-radius:8px;margin-bottom:8px;" onerror="this.style.display='none'" />
              <div style="margin-bottom:6px;">${statusHtml}</div>
              <p style="font-size:11px;color:#6b7280;margin:0;">${spot.ownerName}${phoneHtml}</p>
              ${actionsHtml ? `<div style="margin-top:8px;">${actionsHtml}</div>` : ""}
            </div>
          `,
        });

        iw.open(map, marker);
        infoRef.current = iw;

        google.maps.event.addListenerOnce(iw, "domready", () => {
          const reserveBtn = document.getElementById(`reserve-${spot.id}`);
          if (reserveBtn) {
            reserveBtn.addEventListener("click", async () => {
              try {
                await reserveParkingSpot(spot.id, uid, user?.displayName ?? "Anonimno");
                reserveBtn.textContent = "Rezervisano!";
                reserveBtn.style.background = "#6b7280";
                (reserveBtn as HTMLButtonElement).disabled = true;
              } catch (err) {
                const msg = err instanceof Error ? err.message : "Greška";
                if (msg.includes("Not enough points")) {
                  reserveBtn.textContent = "Nemaš dovoljno bodova";
                  reserveBtn.style.background = "#9ca3af";
                } else {
                  reserveBtn.textContent = msg;
                  reserveBtn.style.background = "#9ca3af";
                }
                (reserveBtn as HTMLButtonElement).disabled = true;
              }
            });
          }

          const removeBtn = document.getElementById(`remove-${spot.id}`);
          if (removeBtn) {
            removeBtn.addEventListener("click", async () => {
              try {
                await removeParkingSpot(spot.id, uid);
                iw.close();
              } catch { /* failed */ }
            });
          }
        });
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
  }, [map, visible, spots, user]);

  return null;
}
