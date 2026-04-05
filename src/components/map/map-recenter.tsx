"use client";

import { useEffect } from "react";
import { useMap } from "@vis.gl/react-google-maps";

export function MapRecenter({ userPos, recenterRef }: { userPos: { lat: number; lng: number } | null; recenterRef: React.MutableRefObject<(() => void) | null> }) {
  const map = useMap();
  useEffect(() => {
    recenterRef.current = () => {
      if (map && userPos) {
        map.panTo(userPos);
        map.setZoom(17);
      }
    };
  }, [map, userPos, recenterRef]);
  return null;
}
