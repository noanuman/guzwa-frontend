"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  X,
  Star,
  Calendar,
  MapPin,
  Trophy,
  LogOut,
  Clock,
  Users,
  UserCircle,
  Loader2,
  Navigation,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth-context";
import {
  getMyRides,
  getJoinedRides,
  getUserPoints,
  cancelRide,
  leaveRide,
  subscribeToRide,
  type Ride,
  type RideNotification,
  markNotificationRead,
} from "@/lib/rides-store";

interface ProfileSheetProps {
  open: boolean;
  onClose: () => void;
  onRideCancelled?: (destination: string) => void;
  onSelectRide?: (ride: Ride) => void;
  onNavigationStop?: () => void;
  notifications?: RideNotification[];
}

type Tab = "my-rides" | "joined" | "points" | "notifications";

export function ProfileSheet({ open, onClose, onRideCancelled, onSelectRide, onNavigationStop, notifications = [] }: ProfileSheetProps) {
  const { user, signInWithGoogle, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>("my-rides");
  const [myRides, setMyRides] = useState<Ride[]>([]);
  const [joinedRides, setJoinedRides] = useState<Ride[]>([]);
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const unsubscribesRef = useRef<(() => void)[]>([]);

  const refresh = useCallback(async () => {
    if (!user) {
      setMyRides([]);
      setJoinedRides([]);
      setPoints(0);
      return;
    }
    setLoading(true);
    try {
      const [my, joined, pts] = await Promise.all([
        getMyRides(user.uid),
        getJoinedRides(user.uid),
        getUserPoints(user.uid),
      ]);
      setMyRides(my);
      setJoinedRides(joined);
      setPoints(pts);

      // Subscribe to joined rides for cancellation notifications
      unsubscribesRef.current.forEach((unsub) => unsub());
      unsubscribesRef.current = [];

      for (const ride of joined) {
        if (ride.status === "open" || ride.status === "full") {
          const unsub = subscribeToRide(ride.id, (updated) => {
            if (updated && updated.status === "cancelled") {
              onRideCancelled?.(updated.destinationName);
              // Refresh the list
              refresh();
            }
          });
          unsubscribesRef.current.push(unsub);
        }
      }
    } catch (err) {
      console.error("Failed to load profile data:", err);
    } finally {
      setLoading(false);
    }
  }, [user, onRideCancelled]);

  useEffect(() => {
    if (open) refresh();
    return () => {
      unsubscribesRef.current.forEach((unsub) => unsub());
      unsubscribesRef.current = [];
    };
  }, [open, refresh]);

  const handleCancel = async (rideId: string) => {
    if (!user) return;
    setActionLoading(rideId);
    try {
      await cancelRide(rideId, user.uid);
      onNavigationStop?.();
      await refresh();
    } catch (err) {
      console.error("Failed to cancel ride:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleLeave = async (rideId: string) => {
    if (!user) return;
    setActionLoading(rideId);
    try {
      await leaveRide(rideId, user.uid);
      await refresh();
    } catch (err) {
      console.error("Failed to leave ride:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setMyRides([]);
    setJoinedRides([]);
    setPoints(0);
    onClose();
  };

  const formatDate = (ts: { toDate: () => Date }) => {
    const d = ts.toDate();
    return d.toLocaleDateString("sr-Latn", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (ts: { toDate: () => Date }) => {
    const d = ts.toDate();
    return d.toLocaleTimeString("sr-Latn", { hour: "2-digit", minute: "2-digit" });
  };

  const statusLabel = (status: Ride["status"]) => {
    switch (status) {
      case "open":
        return "Otvorena";
      case "full":
        return "Popunjena";
      case "in_progress":
        return "U toku";
      case "completed":
        return "Završena";
      case "cancelled":
        return "Otkazana";
    }
  };

  const statusVariant = (status: Ride["status"]) => {
    switch (status) {
      case "open":
        return "default" as const;
      case "full":
        return "secondary" as const;
      case "in_progress":
        return "default" as const;
      case "completed":
        return "secondary" as const;
      case "cancelled":
        return "destructive" as const;
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "my-rides", label: "Moje vožnje" },
    { key: "joined", label: "Pridružene" },
    { key: "points", label: "Bodovi" },
    { key: "notifications", label: `Obaveštenja${notifications.length > 0 ? ` (${notifications.length})` : ""}` },
  ];

  const renderRideCard = (ride: Ride, type: "driver" | "passenger") => (
    <Card
      key={ride.id}
      className="border-0 shadow-sm transition-shadow duration-200 hover:shadow-md"
    >
      <CardContent className="space-y-2 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
              <p className="truncate text-sm font-medium">{ride.destinationName}</p>
            </div>
            <p className="mt-0.5 truncate pl-5.5 text-xs text-muted-foreground">
              {ride.destinationAddress}
            </p>
          </div>
          <Badge
            variant={statusVariant(ride.status)}
            className="shrink-0 rounded-full text-[10px]"
          >
            {statusLabel(ride.status)}
          </Badge>
        </div>

        <div className="flex items-center gap-3 pl-5.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDate(ride.scheduledAt)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatTime(ride.scheduledAt)}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {ride.passengers.length}/{ride.maxPassengers}
          </span>
        </div>

        {/* Passenger avatars */}
        {ride.passengers.length > 0 && (
          <div className="flex items-center gap-1.5 pl-5.5">
            <div className="flex -space-x-1">
              {ride.passengers.slice(0, 5).map((p) =>
                p.photo ? (
                  <img
                    key={p.uid}
                    src={p.photo}
                    alt={p.name}
                    title={p.name}
                    className="h-5 w-5 rounded-full border-2 border-background object-cover"
                  />
                ) : (
                  <div
                    key={p.uid}
                    title={p.name}
                    className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-muted text-[8px] font-bold"
                  >
                    {p.name[0]}
                  </div>
                )
              )}
            </div>
            {ride.passengers.length > 5 && (
              <span className="text-[10px] text-muted-foreground">
                +{ride.passengers.length - 5}
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pl-5.5">
          <Badge variant="secondary" className="rounded-full text-[10px]">
            <Star className="h-2.5 w-2.5 text-amber-500" />
            +{ride.pointsPerPerson} bodova
          </Badge>

          {(ride.status === "open" || ride.status === "full" || ride.status === "in_progress") && (
            <div className="flex gap-1.5">
              {onSelectRide && ride.destinationPlaceId && (
                <Button
                  size="xs"
                  className="gap-1"
                  onClick={() => {
                    onSelectRide(ride);
                    onClose();
                  }}
                >
                  <Navigation className="h-3 w-3" />
                  Nastavi
                </Button>
              )}
              {(ride.status === "open" || ride.status === "full") && (
                <Button
                  variant="destructive"
                  size="xs"
                  disabled={actionLoading === ride.id}
                  onClick={() =>
                    type === "driver" ? handleCancel(ride.id) : handleLeave(ride.id)
                  }
                >
                  {actionLoading === ride.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : type === "driver" ? (
                    "Otkaži"
                  ) : (
                    "Napusti"
                  )}
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-[1200] bg-black/20 backdrop-blur-[2px] animate-in fade-in duration-200"
          onClick={onClose}
        />
      )}

      {/* Sheet */}
      <div
        className={`fixed inset-y-0 left-0 z-[1201] w-full max-w-sm bg-background shadow-2xl transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col overflow-y-auto">
          {/* Header */}
          <div className="flex items-start gap-4 px-5 pt-6 pb-4">
            {user ? (
              <>
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName ?? ""}
                    className="h-14 w-14 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                    {(user.displayName ?? "K")[0].toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold">
                    {user.displayName ?? "Korisnik"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    <Badge variant="secondary" className="rounded-full text-xs">
                      {points} bodova
                    </Badge>
                  </div>
                </div>
              </>
            ) : (
              <>
                <UserCircle className="h-14 w-14 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold">Gost</p>
                  <p className="text-xs text-muted-foreground">
                    Prijavi se za pristup svim funkcijama
                  </p>
                </div>
              </>
            )}
            <Button variant="ghost" size="icon-sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <Separator />

          {user ? (
            <>
              {/* Tabs */}
              <div className="flex border-b px-5">
                {tabs.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`flex-1 py-2.5 text-center text-sm font-medium transition-colors ${
                      tab === t.key
                        ? "border-b-2 border-primary text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                {loading && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                )}

                {!loading && tab === "my-rides" && (
                  <div className="space-y-3">
                    {myRides.length === 0 && (
                      <p className="py-8 text-center text-sm text-muted-foreground">
                        Nema ponudjenih vožnji
                      </p>
                    )}
                    {myRides.map((ride) => renderRideCard(ride, "driver"))}
                  </div>
                )}

                {!loading && tab === "joined" && (
                  <div className="space-y-3">
                    {joinedRides.length === 0 && (
                      <p className="py-8 text-center text-sm text-muted-foreground">
                        Nisi se pridružio nijednoj vožnji
                      </p>
                    )}
                    {joinedRides.map((ride) => renderRideCard(ride, "passenger"))}
                  </div>
                )}

                {!loading && tab === "points" && (
                  <div className="space-y-5">
                    <Card className="border-0 bg-gradient-to-br from-amber-50 to-orange-50 shadow-sm dark:from-amber-950/30 dark:to-orange-950/30">
                      <CardContent className="flex flex-col items-center py-8">
                        <Trophy className="h-10 w-10 text-amber-500" />
                        <p className="mt-3 text-3xl font-bold">{points}</p>
                        <p className="text-sm text-muted-foreground">Ukupno bodova</p>
                      </CardContent>
                    </Card>

                    <Separator />

                    <div className="space-y-3">
                      <p className="text-sm font-semibold">Kako da sakupljam bodove?</p>
                      <Card className="border-0 shadow-sm">
                        <CardContent className="flex items-center gap-3 py-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                            <Star className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Ponudi vožnju = 3 boda</p>
                            <p className="text-xs text-muted-foreground">Deli vožnje sa drugima</p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="border-0 shadow-sm">
                        <CardContent className="flex items-center gap-3 py-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                            <MapPin className="h-4 w-4 text-emerald-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Prijavi problem = 1 bod</p>
                            <p className="text-xs text-muted-foreground">Ako 3 korisnika potvrde</p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="border-0 shadow-sm">
                        <CardContent className="flex items-center gap-3 py-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
                            <Trophy className="h-4 w-4 text-amber-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Podeli parking = 3 boda</p>
                            <p className="text-xs text-muted-foreground">Kad neko rezerviše tvoje mesto</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}

                {tab === "notifications" && (
                  <div className="space-y-2">
                    {notifications.length === 0 && (
                      <div className="flex flex-col items-center py-12 text-muted-foreground">
                        <Bell className="h-8 w-8 mb-2 opacity-40" />
                        <p className="text-sm">Nema novih obaveštenja</p>
                      </div>
                    )}
                    {notifications.map((n) => (
                      <Card key={n.id} className="border-0 shadow-sm">
                        <CardContent className="flex items-start gap-3 py-3">
                          <div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                            n.type === "join_request" ? "bg-blue-500" :
                            n.type === "request_accepted" ? "bg-emerald-500" :
                            n.type === "request_declined" ? "bg-amber-500" :
                            "bg-red-500"
                          }`} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm">{n.message}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {n.createdAt?.toDate?.()
                                ? n.createdAt.toDate().toLocaleTimeString("sr-Latn", { hour: "2-digit", minute: "2-digit" })
                                : ""}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => markNotificationRead(n.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <Separator />
              <div className="px-5 py-4">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 text-muted-foreground"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4" />
                  Odjavi se
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex-1 px-5 py-8">
                <p className="text-center text-sm text-muted-foreground">
                  Prijavi se da bi video svoje vožnje i bodove
                </p>
              </div>
              <Separator />
              <div className="px-5 py-4">
                <Button
                  variant="outline"
                  className="w-full gap-3 py-5 text-sm font-medium"
                  onClick={signInWithGoogle}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Prijavi se sa Google
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
