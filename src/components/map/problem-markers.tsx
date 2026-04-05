"use client";

import { useEffect, useRef, useState } from "react";
import { useMap } from "@vis.gl/react-google-maps";
import {
  subscribeToProblems,
  likeProblem,
  reportProblemAbuse,
  LIKES_FOR_REWARD,
  type RoadProblem,
} from "@/lib/problems-store";
import { useAuth } from "@/lib/auth-context";

export function ProblemMarkers({ visible }: { visible: boolean }) {
  const map = useMap();
  const { user } = useAuth();
  const markersRef = useRef<google.maps.Marker[]>([]);
  const listenersRef = useRef<google.maps.MapsEventListener[]>([]);
  const infoRef = useRef<google.maps.InfoWindow | null>(null);
  const [problems, setProblems] = useState<RoadProblem[]>([]);

  useEffect(() => {
    if (!visible) return;
    const unsub = subscribeToProblems(setProblems);
    return unsub;
  }, [visible]);

  useEffect(() => {
    if (!map) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    listenersRef.current.forEach((l) => google.maps.event.removeListener(l));
    listenersRef.current = [];
    infoRef.current?.close();

    if (!visible || problems.length === 0) return;

    const uid = user?.uid ?? "";

    for (const problem of problems) {
      const likeCount = problem.likes.length;
      const isRewarded = likeCount >= LIKES_FOR_REWARD;
      const alreadyLiked = problem.likes.includes(uid);
      const alreadyReported = problem.reports.includes(uid);
      const isOwner = problem.reporterId === uid;

      const iconColor = isRewarded ? "#ef4444" : "#f59e0b";
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
          scaledSize: new google.maps.Size(30, 30),
          anchor: new google.maps.Point(15, 30),
        },
        zIndex: 900,
        title: problem.description,
      });

      const listener = marker.addListener("click", () => {
        infoRef.current?.close();

        const photoHtml = `<img src="/images/reports/${problem.id}.png" style="width:100%;height:100px;object-fit:cover;border-radius:8px 8px 0 0;" onerror="this.style.display='none'" />`;

        const timeStr = problem.createdAt?.toDate?.()
          ? problem.createdAt.toDate().toLocaleTimeString("sr-Latn", { hour: "2-digit", minute: "2-digit" })
          : "";

        const likeBtn = uid && !alreadyLiked && !isOwner
          ? `<button id="like-${problem.id}" style="flex:1;padding:6px;background:#059669;color:white;border:none;border-radius:6px;font-size:11px;cursor:pointer;">👍 Potvrdi (${likeCount})</button>`
          : `<span style="flex:1;text-align:center;padding:6px;background:#e5e7eb;color:#6b7280;border-radius:6px;font-size:11px;">👍 ${likeCount}</span>`;

        const resolveCount = problem.reports.length;
        const reportBtn = uid && !alreadyReported && !isOwner
          ? `<button id="report-${problem.id}" style="flex:1;padding:6px;background:#6b7280;color:white;border:none;border-radius:6px;font-size:11px;cursor:pointer;">✓ Rešeno (${resolveCount}/3)</button>`
          : "";

        const iw = new google.maps.InfoWindow({
          content: `
            <div style="min-width:200px;max-width:260px;font-family:system-ui;">
              ${photoHtml}
              <div style="padding:2px 0 4px;">
                <p style="font-size:14px;font-weight:600;color:#111827;margin:0 0 4px;line-height:1.3;padding-right:28px;">${problem.description}</p>
                <p style="font-size:11px;color:#9ca3af;margin:0 0 8px;">${problem.reporterName}${timeStr ? ` · ${timeStr}` : ""}</p>
                <div style="display:flex;gap:6px;">
                  ${likeBtn}
                  ${reportBtn}
                </div>
              </div>
            </div>
          `,
        });

        iw.open(map, marker);
        infoRef.current = iw;

        google.maps.event.addListenerOnce(iw, "domready", () => {
          const likeEl = document.getElementById(`like-${problem.id}`);
          if (likeEl) {
            likeEl.addEventListener("click", async () => {
              try {
                await likeProblem(problem.id, uid);
                likeEl.textContent = "👍 Potvrđeno!";
                likeEl.style.background = "#6b7280";
                (likeEl as HTMLButtonElement).disabled = true;
              } catch { /* already liked */ }
            });
          }

          const reportEl = document.getElementById(`report-${problem.id}`);
          if (reportEl) {
            reportEl.addEventListener("click", async () => {
              try {
                await reportProblemAbuse(problem.id, uid);
                reportEl.textContent = "✓ Označeno!";
                (reportEl as HTMLButtonElement).disabled = true;
              } catch { /* already reported */ }
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
  }, [map, visible, problems, user]);

  return null;
}
