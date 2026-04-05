"use client";

import { useState } from "react";
import { Car, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  type RideNotification,
  markNotificationRead,
} from "@/lib/rides-store";

interface RideAvailableToastProps {
  notification: RideNotification;
  onViewRide: (rideId: string) => void;
}

export function RideAvailableToast({ notification, onViewRide }: RideAvailableToastProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[1200] animate-in fade-in slide-in-from-top-4 duration-300">
      <Card className="w-[340px] shadow-xl border-emerald-200 bg-white">
        <CardContent className="space-y-3 py-3">
          <div className="flex items-center gap-3">
            <Car className="h-8 w-8 text-emerald-500 shrink-0" />
            <p className="text-sm font-medium">{notification.message}</p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 gap-1 bg-emerald-600 hover:bg-emerald-700"
              onClick={() => {
                markNotificationRead(notification.id);
                onViewRide(notification.rideId);
                setDismissed(true);
              }}
            >
              <Car className="h-3 w-3" />
              Pogledaj vožnju
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 gap-1"
              onClick={() => {
                markNotificationRead(notification.id);
                setDismissed(true);
              }}
            >
              <X className="h-3 w-3" />
              Odbaci
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
