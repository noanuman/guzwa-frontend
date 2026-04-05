"use client";

import { useState, useEffect } from "react";
import { Check, XCircle, Loader2, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  type RideNotification,
  markNotificationRead,
  getMyRides,
  acceptJoinRequest,
  declineJoinRequest,
} from "@/lib/rides-store";
import { useAuth } from "@/lib/auth-context";

interface JoinRequestToastProps {
  notification: RideNotification;
  onHandled: () => void;
  onPickupFound?: (lat: number, lng: number) => void;
  onPickupClear?: () => void;
}

export function JoinRequestToast({ notification, onHandled, onPickupFound, onPickupClear }: JoinRequestToastProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState<"accept" | "decline" | null>(null);
  const [done, setDone] = useState(false);

  // Find pickup location from the pending request and show pulsing marker
  useEffect(() => {
    if (!user) return;
    (async () => {
      const myRides = await getMyRides(user.uid);
      const activeRide = myRides.find((r) => r.status === "open" || r.status === "full");
      if (activeRide) {
        const pending = activeRide.pendingRequests.find((r) => r.status === "pending");
        if (pending?.pickupLat && pending?.pickupLng) {
          onPickupFound?.(pending.pickupLat, pending.pickupLng);
        }
      }
    })();
    return () => onPickupClear?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleAction = async (action: "accept" | "decline") => {
    if (!user || loading) return;
    setLoading(action);
    try {
      // Find driver's active ride and the pending request
      const myRides = await getMyRides(user.uid);
      const activeRide = myRides.find((r) => r.status === "open" || r.status === "full");
      if (activeRide) {
        const pending = activeRide.pendingRequests.find((r) => r.status === "pending");
        if (pending) {
          if (action === "accept") {
            await acceptJoinRequest(activeRide.id, user.uid, pending.uid);
          } else {
            await declineJoinRequest(activeRide.id, user.uid, pending.uid);
          }
        }
      }
      await markNotificationRead(notification.id);
      onPickupClear?.();
      setDone(true);
      setTimeout(onHandled, 1000);
    } catch (err) {
      console.error("Failed to handle join request:", err);
      setLoading(null);
    }
  };

  if (done) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[1200] animate-in fade-in slide-in-from-top-4 duration-300">
      <Card className="w-[340px] shadow-xl border-blue-200 bg-white">
        <CardContent className="space-y-3 py-3">
          <div className="flex items-center gap-3">
            <UserCircle className="h-8 w-8 text-blue-500 shrink-0" />
            <p className="text-sm font-medium">{notification.message}</p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 gap-1 bg-emerald-600 hover:bg-emerald-700"
              disabled={loading !== null}
              onClick={() => handleAction("accept")}
            >
              {loading === "accept" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              Prihvati
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 gap-1"
              disabled={loading !== null}
              onClick={() => handleAction("decline")}
            >
              {loading === "decline" ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
              Odbij
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
