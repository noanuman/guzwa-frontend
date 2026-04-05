"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Hls from "hls.js";
import type { CameraData } from "./camera-markers";

interface CameraPopoverProps {
  camera: CameraData;
  onClose: () => void;
}

export function CameraPopover({ camera, onClose }: CameraPopoverProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported()) {
      const proxiedUrl = `/api/hls?url=${encodeURIComponent(camera.link)}`;
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        xhrSetup: (xhr: XMLHttpRequest, urlStr: string) => {
          // If hls.js tries to fetch from the camera origin directly, proxy it
          if (urlStr.startsWith("https://srbija-nadlanu.ott.solutions/")) {
            xhr.open("GET", `/api/hls?url=${encodeURIComponent(urlStr)}`, true);
          }
        },
      });
      hls.loadSource(proxiedUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });
      hlsRef.current = hls;
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = `/api/hls?url=${encodeURIComponent(camera.link)}`;
      video.play().catch(() => {});
    }

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [camera.link]);

  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Popover */}
      <Card className="relative z-10 w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <CardContent className="p-0">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{camera.name}</p>
              <p className="text-xs text-muted-foreground">Uživo prenos</p>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Video */}
          <div className="relative aspect-video w-full bg-black">
            <video
              ref={videoRef}
              className="h-full w-full object-contain"
              controls
              autoPlay
              muted
              playsInline
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
