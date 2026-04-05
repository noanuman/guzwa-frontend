"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Car,
  X,
  Search,
  Users,
  ArrowLeft,
  UserCircle,
  Loader2,
  MapPin,
  Navigation,
  Check,
  XCircle,
  CalendarDays,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth-context";
import {
  createRide,
  getAvailableRides,
  requestToJoin,
  subscribeToRide,
  type Ride,
  type RequestToJoinData,
} from "@/lib/rides-store";
import type { SelectedPlace } from "@/components/map/types";

interface RideSharePromptProps {
  onDismiss: () => void;
  onConfirm: (scheduledAt: Date) => void;
  onStartPassengerSearch?: () => void;
  destination: SelectedPlace | null;
  originName?: string;
  originAddress?: string;
  originLat?: number;
  originLng?: number;
  destinationLat?: number;
  destinationLng?: number;
  driverRoutePath?: { lat: number; lng: number }[];
  /** Called when passenger needs to pick a point on driver's route */
  onShowPickupSelector?: (routePath: { lat: number; lng: number }[], onPicked: (lat: number, lng: number) => void) => void;
  /** Called to clear the pickup selector from the map */
  onClearPickupSelector?: () => void;
  /** Called when driver's active ride updates, so parent can show pickup markers */
  onActiveRideUpdate?: (ride: Ride | null) => void;
  /** Called when passenger confirms pickup — navigate them to the pickup point */
  onNavigateToPickup?: (lat: number, lng: number) => void;
}

type Screen = "choose" | "driver-schedule" | "driver-active" | "passenger-schedule" | "passenger-rides" | "pickup-select" | "backend-match-pickup";

const fullscreenPosition =
  "fixed inset-0 z-[1100] overflow-y-auto bg-background/95 backdrop-blur-sm p-5 flex flex-col items-center justify-center";

const overlayPosition =
  "fixed bottom-4 left-1/2 z-[1100] w-[360px] -translate-x-1/2 md:bottom-auto md:top-4 md:right-4 md:left-auto md:translate-x-0";

export function RideSharePrompt({
  onDismiss,
  onConfirm,
  onStartPassengerSearch,
  destination,
  originName,
  originAddress,
  originLat,
  originLng,
  destinationLat,
  destinationLng,
  driverRoutePath,
  onShowPickupSelector,
  onClearPickupSelector,
  onActiveRideUpdate,
  onNavigateToPickup,
}: RideSharePromptProps) {
  const { user, signInWithGoogle } = useAuth();
  const [screen, setScreen] = useState<Screen>("choose");
  const [loading, setLoading] = useState(false);
  const [availableRides, setAvailableRides] = useState<Ride[]>([]);
  const [ridesLoading, setRidesLoading] = useState(false);
  const [requestSent, setRequestSent] = useState<string | null>(null);
  const [activeRideId, setActiveRideId] = useState<string | null>(null);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [backendMatch, setBackendMatch] = useState<{
    id: string;
    idVozaca: string;
    vreme: string;
    score: number;
    listaTacaka: string[];
  } | null>(null);
  const [selectedRideForPickup, setSelectedRideForPickup] = useState<Ride | null>(null);
  const [pickupPoint, setPickupPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  });
  const maxDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  })();

  const isDateTimeInPast = () => {
    const [year, month, day] = date.split("-").map(Number);
    const [hours, minutes] = time.split(":").map(Number);
    const selected = new Date(year, month - 1, day, hours, minutes);
    return selected < new Date();
  };

  // Subscribe to active ride for real-time join request updates (driver mode)
  useEffect(() => {
    if (!activeRideId) return;
    const unsub = subscribeToRide(activeRideId, (ride) => {
      setActiveRide(ride);
      onActiveRideUpdate?.(ride);
    });
    return () => {
      unsub();
      onActiveRideUpdate?.(null);
    };
  }, [activeRideId]);

  // Load available rides when switching to passenger rides screen
  useEffect(() => {
    if (screen !== "passenger-rides" || !destination || !user) return;
    setRidesLoading(true);
    setBackendMatch(null);

    // Firestore query for rides near destination (within 3km)
    const firestorePromise = getAvailableRides(destinationLat, destinationLng, destination.placeId)
      .then(setAvailableRides)
      .catch(() => setAvailableRides([]));

    // Backend path-matching query
    const backendPromise = (async () => {
      if (!originLat || !originLng || !destinationLat || !destinationLng) return;
      try {
        const resp = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/api/povezi`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id_putnika: user.uid,
            datumPutnik: date,
            pairTime: time,
            putnik_start_point: `${originLat}, ${originLng}`,
            putnik_end_point: `${destinationLat}, ${destinationLng}`,
          }),
        });
        const data = await resp.json();
        if (data.ok) setBackendMatch(data);
      } catch { /* backend unavailable */ }
    })();

    Promise.all([firestorePromise, backendPromise]).finally(() => setRidesLoading(false));
  }, [screen, destination, user, originLat, originLng, destinationLat, destinationLng, date, time]);

  const handleCreateRide = async (scheduledAt: Date) => {
    if (!user || !destination) return;
    setLoading(true);
    try {
      const rideId = await createRide(user.uid, {
        driverName: user.displayName ?? "Anonimno",
        driverPhoto: user.photoURL ?? "",
        destinationName: destination.name,
        destinationAddress: destination.address,
        destinationPlaceId: destination.placeId,
        originName: originName ?? "",
        originAddress: originAddress ?? "",
        originLat: originLat ?? 0,
        originLng: originLng ?? 0,
        destinationLat: destinationLat ?? 0,
        destinationLng: destinationLng ?? 0,
        scheduledAt,
        routePath: driverRoutePath ?? [],
      });

      // Also POST the driving path to the backend for route matching
      if (driverRoutePath && driverRoutePath.length > 0) {
        const timeStr = `${String(scheduledAt.getHours()).padStart(2, "0")}:${String(scheduledAt.getMinutes()).padStart(2, "0")}`;
        const dateStr = scheduledAt.toISOString().split("T")[0];
        try {
          await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/api/putanja`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id_vozaca: user.uid,
              vreme: timeStr,
              tacke: driverRoutePath.map((p) => `${p.lat}, ${p.lng}`),
              datumVozac: dateStr,
            }),
          });
        } catch {
          // Backend path posting failed — ride still created in Firestore
        }
      }

      setActiveRideId(rideId);
      setScreen("driver-active");
      onConfirm(scheduledAt);
    } catch (err) {
      console.error("Failed to create ride:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestJoin = (ride: Ride) => {
    if (!user || !destination) return;
    // If the ride has a route path, let passenger pick a point on it
    if (ride.routePath && ride.routePath.length >= 2 && onShowPickupSelector) {
      setSelectedRideForPickup(ride);
      setPickupPoint(null);
      setScreen("pickup-select");
      onShowPickupSelector(ride.routePath, (lat, lng) => handleFirestorePickup(lat, lng));
      return;
    }
    // Fallback: send request with current origin as pickup
    sendJoinRequest(ride, originLat ?? 0, originLng ?? 0);
  };

  const sendJoinRequest = async (ride: Ride, pLat: number, pLng: number) => {
    if (!user || !destination) return;
    setLoading(true);
    try {
      const data: RequestToJoinData = {
        name: user.displayName ?? "Anonimno",
        photo: user.photoURL ?? "",
        pickupName: "Izabrana tačka",
        pickupAddress: `${pLat.toFixed(5)}, ${pLng.toFixed(5)}`,
        pickupLat: pLat,
        pickupLng: pLng,
        destinationName: destination.name,
        destinationAddress: destination.address,
      };
      await requestToJoin(ride.id, user.uid, data);
      setRequestSent(ride.id);
      onClearPickupSelector?.();
      setScreen("passenger-rides");
    } catch (err) {
      console.error("Failed to request join:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatRideTime = (ts: { toDate: () => Date }) => {
    const d = ts.toDate();
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return `Danas u ${d.toLocaleTimeString("sr-Latn", { hour: "2-digit", minute: "2-digit" })}`;
    }
    return d.toLocaleDateString("sr-Latn", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Backend match pickup — auto-confirm on first tap
  const handleBackendPickup = useCallback(async (lat: number, lng: number) => {
    if (!backendMatch || !user || !destination) return;
    setPickupPoint({ lat, lng });
    setLoading(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/api/potvrdiPar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          putanjaId: backendMatch.id,
          id_putnika: user.uid,
          datumPutnik: date,
          pickupLat: lat,
          pickupLng: lng,
        }),
      });
      const matchingRide = availableRides.find((r) => r.driverId === backendMatch.idVozaca);
      if (matchingRide) {
        try {
          await requestToJoin(matchingRide.id, user.uid, {
            name: user.displayName ?? "Anonimno",
            photo: user.photoURL ?? "",
            pickupName: "Izabrana tačka na ruti",
            pickupAddress: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
            pickupLat: lat,
            pickupLng: lng,
            destinationName: destination.name,
            destinationAddress: destination.address,
          });
        } catch { /* ride may not exist in Firestore */ }
      }
      onClearPickupSelector?.();
      setScreen("choose");
      setBackendMatch(null);
      setPickupPoint(null);
      onNavigateToPickup?.(lat, lng);
    } catch (err) {
      console.error("Failed to confirm pairing:", err);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backendMatch, user, destination, date, availableRides]);

  // Firestore rides pickup — auto-confirm on first tap
  const handleFirestorePickup = useCallback(async (lat: number, lng: number) => {
    if (!selectedRideForPickup || !user || !destination) return;
    setPickupPoint({ lat, lng });
    setLoading(true);
    try {
      await requestToJoin(selectedRideForPickup.id, user.uid, {
        name: user.displayName ?? "Anonimno",
        photo: user.photoURL ?? "",
        pickupName: "Izabrana tačka",
        pickupAddress: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        pickupLat: lat,
        pickupLng: lng,
        destinationName: destination.name,
        destinationAddress: destination.address,
      });
      setRequestSent(selectedRideForPickup.id);
      onClearPickupSelector?.();
      setSelectedRideForPickup(null);
      setPickupPoint(null);
      setScreen("choose");
      onNavigateToPickup?.(lat, lng);
    } catch (err) {
      console.error("Failed to request join:", err);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRideForPickup, user, destination]);

  // Not logged in
  if (!user) {
    return (
      <div className={`${fullscreenPosition} animate-in fade-in slide-in-from-bottom-5 duration-500`}>
        <Card className="w-full max-w-lg shadow-xl">
          <CardContent className="space-y-3 py-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Car className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Podeli vožnju?</p>
                <p className="text-xs text-muted-foreground">
                  Prijavi se da bi delio vožnju sa drugima
                </p>
              </div>
              <Button variant="ghost" size="icon-xs" onClick={onDismiss}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Button className="w-full" size="sm" onClick={signInWithGoogle}>
              Prijavi se sa Google
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Driver schedule — pick date/time before creating ride
  if (screen === "driver-schedule") {
    return (
      <div className={`${fullscreenPosition} animate-in fade-in slide-in-from-bottom-3 duration-300`}>
        <Card className="w-full max-w-lg shadow-xl">
          <CardContent className="space-y-3 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon-xs" onClick={() => setScreen("choose")}>
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Button>
                <p className="text-sm font-semibold">Kada krećeš?</p>
              </div>
              <Button variant="ghost" size="icon-xs" onClick={onDismiss}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={date}
                min={new Date().toISOString().split("T")[0]}
                max={maxDate}
                onChange={(e) => setDate(e.target.value)}
                className="h-8 text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="h-8 text-sm"
              />
            </div>

            {isDateTimeInPast() && (
              <p className="text-xs text-red-500 text-center">Izabrano vreme je već prošlo</p>
            )}

            <Button
              size="sm"
              className="w-full"
              disabled={loading || isDateTimeInPast()}
              onClick={() => {
                const [year, month, day] = date.split("-").map(Number);
                const [hours, minutes] = time.split(":").map(Number);
                const scheduled = new Date(year, month - 1, day, hours, minutes);
                handleCreateRide(scheduled);
              }}
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Potvrdi termin"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Passenger schedule — pick date/time before searching rides
  if (screen === "passenger-schedule") {
    return (
      <div className={`${fullscreenPosition} animate-in fade-in slide-in-from-bottom-3 duration-300`}>
        <Card className="w-full max-w-lg shadow-xl">
          <CardContent className="space-y-3 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon-xs" onClick={() => setScreen("choose")}>
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Button>
                <p className="text-sm font-semibold">Kada ti treba vožnja?</p>
              </div>
              <Button variant="ghost" size="icon-xs" onClick={onDismiss}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={date}
                min={new Date().toISOString().split("T")[0]}
                max={maxDate}
                onChange={(e) => setDate(e.target.value)}
                className="h-8 text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="h-8 text-sm"
              />
            </div>

            {isDateTimeInPast() && (
              <p className="text-xs text-red-500 text-center">Izabrano vreme je već prošlo</p>
            )}

            <Button
              size="sm"
              className="w-full"
              disabled={isDateTimeInPast()}
              onClick={() => setScreen("passenger-rides")}
            >
              Potvrdi termin
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Driver active — shows navigation + incoming join requests
  if (screen === "driver-active") {
    const pendingRequests = activeRide?.pendingRequests.filter((r) => r.status === "pending") ?? [];
    const passengers = activeRide?.passengers ?? [];

    return (
      <div className={`${fullscreenPosition} animate-in fade-in slide-in-from-bottom-3 duration-300`}>
        <Card className="w-full max-w-lg shadow-xl">
          <CardContent className="space-y-3 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                  <Navigation className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Voziš</p>
                  <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                    {destination?.name}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon-xs" onClick={onDismiss}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Current passengers */}
            {passengers.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Putnici ({passengers.length}/{activeRide?.maxPassengers ?? 4})
                  </p>
                  <div className="space-y-2">
                    {passengers.map((p) => (
                      <div key={p.uid} className="flex items-center gap-2">
                        {p.photo ? (
                          <img src={p.photo} alt={p.name} className="h-6 w-6 rounded-full object-cover" />
                        ) : (
                          <UserCircle className="h-6 w-6 text-muted-foreground" />
                        )}
                        <span className="text-sm">{p.name}</span>
                        <Badge variant="secondary" className="ml-auto text-[10px]">
                          <Check className="h-2.5 w-2.5 mr-0.5" />
                          Primljen
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Pending join requests */}
            {pendingRequests.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Zahtevi za pridruživanje
                  </p>
                  <div className="space-y-2">
                    {pendingRequests.map((req) => (
                      <Card key={req.uid} className="border-amber-200 bg-amber-50/50">
                        <CardContent className="space-y-2 py-3">
                          <div className="flex items-center gap-2">
                            {req.photo ? (
                              <img src={req.photo} alt={req.name} className="h-8 w-8 rounded-full object-cover" />
                            ) : (
                              <UserCircle className="h-8 w-8 text-muted-foreground" />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium">{req.name}</p>
                            </div>
                          </div>

                          <div className="space-y-1 text-[11px] text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-3 w-3 text-emerald-500 shrink-0" />
                              <span className="truncate">Pickup: {req.pickupName}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Navigation className="h-3 w-3 text-blue-500 shrink-0" />
                              <span className="truncate">Do: {req.destinationName}</span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1 gap-1 bg-emerald-600 hover:bg-emerald-700"
                              onClick={async () => {
                                const { acceptJoinRequest } = await import("@/lib/rides-store");
                                await acceptJoinRequest(activeRideId!, user.uid, req.uid);
                              }}
                            >
                              <Check className="h-3 w-3" />
                              Prihvati
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 gap-1"
                              onClick={async () => {
                                const { declineJoinRequest } = await import("@/lib/rides-store");
                                await declineJoinRequest(activeRideId!, user.uid, req.uid);
                              }}
                            >
                              <XCircle className="h-3 w-3" />
                              Odbij
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </>
            )}

            {pendingRequests.length === 0 && passengers.length === 0 && (
              <>
                <Separator />
                <p className="text-xs text-muted-foreground text-center py-2">
                  Čeka se da se putnici pridruže...
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (screen === "backend-match-pickup" && backendMatch) {
    return (
      <div className={`${overlayPosition} animate-in fade-in slide-in-from-bottom-3 duration-300`}>
        <Card className="shadow-xl">
          <CardContent className="space-y-3 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => {
                    onClearPickupSelector?.();
                    setPickupPoint(null);
                    setScreen("passenger-rides");
                  }}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Button>
                <p className="text-sm font-semibold">Tapni gde da te pokupi</p>
              </div>
              <Button variant="ghost" size="icon-xs" onClick={onDismiss}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-xs text-muted-foreground">Potvrđujem...</span>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Tapni jednom na zelenu rutu — automatski ćeš biti povezan i navigiran do te tačke.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (screen === "pickup-select" && selectedRideForPickup) {
    return (
      <div className={`${overlayPosition} animate-in fade-in slide-in-from-bottom-3 duration-300`}>
        <Card className="shadow-xl">
          <CardContent className="space-y-3 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => {
                    onClearPickupSelector?.();
                    setScreen("passenger-rides");
                    setSelectedRideForPickup(null);
                    setPickupPoint(null);
                  }}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Button>
                <p className="text-sm font-semibold">Tapni gde da te pokupi</p>
              </div>
              <Button variant="ghost" size="icon-xs" onClick={onDismiss}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-xs text-muted-foreground">Potvrđujem...</span>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Tapni jednom na zelenu rutu — automatski ćeš biti povezan i navigiran do te tačke.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Passenger — find available rides
  if (screen === "passenger-rides") {
    return (
      <div className={`${fullscreenPosition} animate-in fade-in slide-in-from-bottom-3 duration-300`}>
        <Card className="w-full max-w-lg shadow-xl">
          <CardContent className="space-y-3 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon-xs" onClick={() => setScreen("choose")}>
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Button>
                <p className="text-sm font-semibold">Dostupne vožnje</p>
              </div>
              <Button variant="ghost" size="icon-xs" onClick={onDismiss}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Pickup + destination info */}
            <div className="space-y-1.5 rounded-lg bg-muted/50 p-2.5">
              <div className="flex items-center gap-2 text-xs">
                <MapPin className="h-3 w-3 text-emerald-500 shrink-0" />
                <span className="truncate">
                  <span className="text-muted-foreground">Od: </span>
                  <span className="font-medium">{originName || "Moja lokacija"}</span>
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Navigation className="h-3 w-3 text-blue-500 shrink-0" />
                <span className="truncate">
                  <span className="text-muted-foreground">Do: </span>
                  <span className="font-medium">{destination?.name}</span>
                </span>
              </div>
            </div>

            <Separator />

            {/* Backend route match — accept or decline */}
            {!ridesLoading && backendMatch && (
              <Card className="border-emerald-200 bg-emerald-50/50">
                <CardContent className="space-y-2 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                      <Navigation className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Pronađen vozač na tvojoj ruti</p>
                      <p className="text-[11px] text-muted-foreground">
                        Polazak u {backendMatch.vreme} · Poklapanje rute: {Math.round((1 - Math.min(backendMatch.score, 1)) * 100)}%
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 gap-1 bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => {
                        if (!backendMatch.listaTacaka || backendMatch.listaTacaka.length < 2 || !onShowPickupSelector) return;
                        const routePath = backendMatch.listaTacaka.map((t) => {
                          const [lat, lng] = t.split(", ").map(Number);
                          return { lat, lng };
                        });
                        setPickupPoint(null);
                        setScreen("backend-match-pickup");
                        onShowPickupSelector(routePath, (lat, lng) => handleBackendPickup(lat, lng));
                      }}
                    >
                      <Check className="h-3 w-3" />
                      Pogledaj rutu
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-1"
                      onClick={() => setBackendMatch(null)}
                    >
                      <XCircle className="h-3 w-3" />
                      Odbij
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {ridesLoading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {!ridesLoading && !backendMatch && availableRides.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nema dostupnih vožnji za ovu destinaciju
              </p>
            )}

            {!ridesLoading &&
              availableRides.map((ride) => (
                <Card
                  key={ride.id}
                  className="border-0 shadow-sm transition-shadow duration-200 hover:shadow-md"
                >
                  <CardContent className="space-y-2 py-3">
                    <div className="flex items-center gap-3">
                      {ride.driverPhoto ? (
                        <img
                          src={ride.driverPhoto}
                          alt={ride.driverName}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <UserCircle className="h-8 w-8 text-muted-foreground" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{ride.driverName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatRideTime(ride.scheduledAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {ride.passengers.length}/{ride.maxPassengers}
                        </span>
                      </div>
                    </div>

                    {/* Origin/destination of the ride */}
                    <div className="space-y-1 pl-11 text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-2.5 w-2.5 text-emerald-500 shrink-0" />
                        <span className="truncate">{ride.originName || "—"}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Navigation className="h-2.5 w-2.5 text-blue-500 shrink-0" />
                        <span className="truncate">{ride.destinationName}</span>
                      </div>
                    </div>

                    {requestSent === ride.id ? (
                      <Badge className="w-full justify-center rounded-full bg-amber-500 text-xs text-white">
                        Zahtev poslat — čeka se odgovor vozača
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        className="w-full"
                        disabled={loading || ride.driverId === user.uid}
                        onClick={() => handleRequestJoin(ride)}
                      >
                        {loading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : ride.driverId === user.uid ? (
                          "Tvoja vožnja"
                        ) : (
                          "Zatraži pridruživanje"
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Default: choose — Driver or Passenger
  return (
    <div className={`${fullscreenPosition} animate-in fade-in slide-in-from-bottom-5 duration-500`}>
      <Card className="w-full max-w-lg shadow-xl">
        <CardContent className="space-y-3 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Car className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Podeli vožnju?</p>
              <p className="text-xs text-muted-foreground">
                Da li voziš ili tražiš vožnju?
              </p>
            </div>
            <Button variant="ghost" size="icon-xs" onClick={onDismiss}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          <Separator />

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5"
              onClick={() => setScreen("driver-schedule")}
            >
              <Car className="h-3.5 w-3.5" />
              Ja vozim
            </Button>
            <Button
              size="sm"
              className="flex-1 gap-1.5"
              onClick={() => setScreen("passenger-schedule")}
            >
              <Search className="h-3.5 w-3.5" />
              Tražim vožnju
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
