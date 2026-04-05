"use client";

import { useEffect, useRef, useState } from "react";
import { useMap } from "@vis.gl/react-google-maps";
import {
  subscribeToProblems,
  confirmProblem,
  type RoadProblem,
} from "@/lib/problems-store";
import { useAuth } from "@/lib/auth-context";

const CONFIRMATIONS_NEEDED = 3;

export function ProblemMarkers({ visible }: { visible: boolean }) {
  const map = useMap();
  const { user } = useAuth();
  const markersRef = useRef<google.maps.Marker[]>([]);
  const listenersRef = useRef<google.maps.MapsEventListener[]>([]);
  const infoRef = useRef<google.maps.InfoWindow | null>(null);
  const [problems, setProblems] = useState<RoadProblem[]>([]);

  // Subscribe to problems from Firestore
  useEffect(() => {
    if (!visible) return;
    const unsub = subscribeToProblems(setProblems);
    return unsub;
  }, [visible]);

  // Render markers
  useEffect(() => {
    if (!map) return;

    // Cleanup
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    listenersRef.current.forEach((l) => google.maps.event.removeListener(l));
    listenersRef.current = [];
    infoRef.current?.close();

    if (!visible || problems.length === 0) return;

    const uid = user?.uid ?? "";

    // Filter: show confirmed to all, pending only to reporter
    const visibleProblems = problems.filter(
      (p) => p.status === "confirmed" || p.reporterId === uid
    );

    for (const problem of visibleProblems) {
      const isPending = problem.status === "pending";
      const alreadyConfirmed = problem.confirmedBy.includes(uid);
      const confirmCount = problem.confirmedBy.length;

      // Icon: orange warning triangle
      const iconColor = isPending ? "#f59e0b" : "#ef4444";
      const iconSvg = `data:image/svg+xml,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
          <polygon points="16,4 30,28 2,28" fill="${iconColor}" stroke="white" stroke-width="2" stroke-linejoin="round"/>
          <text x="16" y="24" text-anchor="middle" font-size="14" font-weight="bold" fill="white">!</text>
        </svg>
      `)}`;

      const marker = new google.maps.Marker({
        map,
        position: { lat: problem.lat, lng: problem.lng },
        icon: {
          url: iconSvg,
          scaledSize: new google.maps.Size(isPending ? 24 : 30, isPending ? 24 : 30),
          anchor: new google.maps.Point(isPending ? 12 : 15, isPending ? 24 : 30),
        },
        opacity: isPending ? 0.6 : 1,
        zIndex: isPending ? 700 : 900,
        title: problem.description,
      });

      const listener = marker.addListener("click", () => {
        infoRef.current?.close();

        const photoHtml = problem.photoUrl
          ? `<img src="${problem.photoUrl}" style="width:100%;max-height:120px;object-fit:cover;border-radius:6px;margin-bottom:6px;" />`
          : "";

        const statusBadge = isPending
          ? `<span style="background:#f59e0b;color:white;padding:1px 6px;border-radius:9px;font-size:10px;">Čeka potvrdu (${confirmCount}/${CONFIRMATIONS_NEEDED})</span>`
          : `<span style="background:#ef4444;color:white;padding:1px 6px;border-radius:9px;font-size:10px;">Potvrđeno</span>`;

        const confirmBtn =
          uid && !alreadyConfirmed && problem.reporterId !== uid
            ? `<button id="confirm-${problem.id}" style="width:100%;margin-top:6px;padding:4px 8px;background:#059669;color:white;border:none;border-radius:6px;font-size:11px;cursor:pointer;">Potvrdi problem</button>`
            : "";

        const iw = new google.maps.InfoWindow({
          content: `
            <div style="max-width:220px;font-family:system-ui;">
              ${photoHtml}
              <div style="margin-bottom:4px;">${statusBadge}</div>
              <p style="font-size:12px;margin:4px 0;color:#374151;">${problem.description}</p>
              <p style="font-size:10px;color:#9ca3af;">
                ${problem.reporterName} · ${problem.createdAt?.toDate?.()
                  ? problem.createdAt.toDate().toLocaleTimeString("sr-Latn", { hour: "2-digit", minute: "2-digit" })
                  : ""}
              </p>
              ${confirmBtn}
            </div>
          `,
        });

        iw.open(map, marker);
        infoRef.current = iw;

        // Attach confirm button handler after info window opens
        if (confirmBtn) {
          google.maps.event.addListenerOnce(iw, "domready", () => {
            const btn = document.getElementById(`confirm-${problem.id}`);
            if (btn) {
              btn.addEventListener("click", async () => {
                try {
                  await confirmProblem(problem.id, uid);
                  btn.textContent = "Potvrđeno!";
                  btn.style.background = "#6b7280";
                  (btn as HTMLButtonElement).disabled = true;
                } catch (err) {
                  console.error("Confirm failed:", err);
                }
              });
            }
          });
        }
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
  }, [map, visible, problems, user]);

  return null;
}
