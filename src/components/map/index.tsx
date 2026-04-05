"use client";

import dynamic from "next/dynamic";

export const Map = dynamic(() => import("./map-view").then((m) => m.MapView), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-muted">
      <p className="text-muted-foreground">Učitavanje mape...</p>
    </div>
  ),
});
