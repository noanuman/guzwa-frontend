"use client";

import { useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface RideNotificationProps {
  destination: string;
  onDismiss: () => void;
}

export function RideNotification({ destination, onDismiss }: RideNotificationProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="fixed top-4 left-1/2 z-[1300] w-[360px] -translate-x-1/2 animate-in fade-in slide-in-from-top-3 duration-300">
      <Card className="border-destructive/50 bg-destructive/5 shadow-lg">
        <CardContent className="flex items-center gap-3 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-destructive">Vožnja otkazana</p>
            <p className="truncate text-xs text-muted-foreground">
              Vožnja do {destination} je otkazana
            </p>
          </div>
          <Button variant="ghost" size="icon-xs" onClick={onDismiss}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
