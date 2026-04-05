"use client";

import { useState, useEffect, useRef } from "react";
import { useMap } from "@vis.gl/react-google-maps";
import { GuzwaFlag } from "@/components/icons/guzwa-flag";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { SelectedPlace } from "./types";

export function RelocateOverlay({ onConfirm, onCancel }: { onConfirm: (place: SelectedPlace) => void; onCancel: () => void }) {
  const map = useMap();
  const [dragging, setDragging] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const [address, setAddress] = useState("");

  useEffect(() => {
    if (!map) return;

    const onDragStart = () => setDragging(true);
    const onIdle = () => {
      setDragging(false);
      // Geocode center after settling
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const center = map.getCenter();
        if (!center) return;
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: center }, (results, status) => {
          if (status === "OK" && results?.[0]) {
            setAddress(results[0].formatted_address);
          }
        });
      }, 400);
    };

    const l1 = map.addListener("dragstart", onDragStart);
    const l2 = map.addListener("idle", onIdle);
    // Trigger initial geocode
    onIdle();

    return () => {
      google.maps.event.removeListener(l1);
      google.maps.event.removeListener(l2);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [map]);

  const handleConfirm = () => {
    if (!map) return;
    const center = map.getCenter();
    if (!center) return;

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: center }, (results, status) => {
      if (status === "OK" && results?.[0]) {
        onConfirm({
          placeId: results[0].place_id,
          name: results[0].formatted_address.split(",")[0],
          address: results[0].formatted_address,
        });
      } else {
        onConfirm({
          placeId: `${center.lat()},${center.lng()}`,
          name: `${center.lat().toFixed(5)}, ${center.lng().toFixed(5)}`,
          address: "Označena lokacija",
        });
      }
    });
  };

  return (
    <>
      {/* Center flag — bottom dot aligned to screen center */}
      <div className="pointer-events-none fixed left-1/2 top-1/2 z-[1001] animate-in fade-in zoom-in-75 duration-400" style={{ transform: "translate(-14%, -95%)" }}>
        <div className={`transition-all duration-300 ease-out ${dragging ? "-translate-y-3 scale-110" : "translate-y-0 scale-100"}`}>
          <GuzwaFlag className="h-14 w-14 drop-shadow-lg" />
        </div>
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-[1001] animate-in fade-in slide-in-from-bottom-4 duration-300">
        <Card className="rounded-none rounded-t-xl shadow-lg">
          <CardContent className="mx-auto max-w-md space-y-3 px-4 py-3">
            <p className="truncate text-center text-sm text-muted-foreground">
              {address || "Pomeri mapu da odabereš lokaciju"}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onCancel}>
                Otkaži
              </Button>
              <Button className="flex-1" onClick={handleConfirm}>
                Potvrdi lokaciju
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
