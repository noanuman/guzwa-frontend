"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { User, SlidersHorizontal, MapPin, X, Navigation, Train, Car, Clock, Locate, Bus, Footprints, ArrowLeft, ChevronRight, TramFront, Star, AlertTriangle, ParkingCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Toggle } from "@/components/ui/toggle";
import { APIProvider, Map as GoogleMap } from "@vis.gl/react-google-maps";

import { BELGRADE, FILTERS } from "@/components/map/constants";
import type { SelectedPlace, TransitStep, TransitRoute, RouteInfo } from "@/components/map/types";
import { useUserLocation } from "@/components/map/use-user-location";
import { MapStyler } from "@/components/map/map-styler";
import { SearchWithAutocomplete } from "@/components/map/search-bar";
import { LiveNavigation } from "@/components/map/live-navigation";
import { UserLocationMarker } from "@/components/map/user-location-marker";
import { DroppablePin } from "@/components/map/droppable-pin";
import { RelocateOverlay } from "@/components/map/relocate-overlay";
import { TransitRouteRenderer } from "@/components/map/transit-route-renderer";
import { MapRecenter } from "@/components/map/map-recenter";
import { BottomBar } from "@/components/map/bottom-bar";
import { RideSharePrompt } from "@/components/map/ride-share-prompt";
import { PickupSelector } from "@/components/map/pickup-selector";
import { type Ride, type RideNotification as RideNotif, subscribeToNotifications, markNotificationRead } from "@/lib/rides-store";
import { ProfileSheet } from "@/components/map/profile-sheet";
import { RideNotification } from "@/components/map/ride-notification";
import { CameraMarkers, type CameraData } from "@/components/map/camera-markers";
import { CameraPopover } from "@/components/map/camera-popover";
import { ReportProblemForm } from "@/components/map/report-problem";
import { ProblemMarkers } from "@/components/map/problem-markers";
import { ReportPinDrop } from "@/components/map/report-pin-drop";
import { ParkingMarkers } from "@/components/map/parking-markers";
import { ParkingForm } from "@/components/map/parking-form";
import { JoinRequestToast } from "@/components/map/join-request-toast";
import { RideAvailableToast } from "@/components/map/ride-available-toast";
import { PulsingPickupMarker } from "@/components/map/pulsing-pickup-marker";
import { useAuth } from "@/lib/auth-context";


export default function MapPage() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const { user } = useAuth();
  const [selectedPlace, setSelectedPlace] = useState<SelectedPlace | null>(null);
  const [activeRoute, setActiveRoute] = useState<RouteInfo | null>(null);
  const [routeDuration, setRouteDuration] = useState("");
  const [routeDurationSecs, setRouteDurationSecs] = useState(0);
  const [navigating, setNavigating] = useState(false);
  const [transitRoutes, setTransitRoutes] = useState<TransitRoute[]>([]);
  const [showTransit, setShowTransit] = useState(false);
  const [activeTransitRoute, setActiveTransitRoute] = useState<TransitRoute | null>(null);
  const [relocating, setRelocating] = useState(false);
  const [relocatingOrigin, setRelocatingOrigin] = useState(false);
  const savedDestRef = useRef<SelectedPlace | null>(null);
  const [showRideSharePrompt, setShowRideSharePrompt] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [rideDestination, setRideDestination] = useState<SelectedPlace | null>(null);
  const [rideOriginName, setRideOriginName] = useState("");
  const [rideOriginAddress, setRideOriginAddress] = useState("");
  const [rideOriginLat, setRideOriginLat] = useState(0);
  const [rideOriginLng, setRideOriginLng] = useState(0);
  const [rideDestLat, setRideDestLat] = useState(0);
  const [rideDestLng, setRideDestLng] = useState(0);
  const [pointsToast, setPointsToast] = useState(false);
  const [cancelledNotification, setCancelledNotification] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set(["cameras", "problems", "parking"]));
  const [activeCamera, setActiveCamera] = useState<CameraData | null>(null);
  const [customOrigin, setCustomOrigin] = useState<SelectedPlace | null>(null);
  const [customOriginCoords, setCustomOriginCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [reportingProblem, setReportingProblem] = useState(false);
  const [reportPinLocation, setReportPinLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [postingParking, setPostingParking] = useState(false);
  const [parkingPinLocation, setParkingPinLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [driverRoutePath, setDriverRoutePath] = useState<{ lat: number; lng: number }[]>([]);
  const [pickupSelectorRoute, setPickupSelectorRoute] = useState<{ lat: number; lng: number }[] | null>(null);
  const pickupSelectorCallbackRef = useRef<((lat: number, lng: number) => void) | null>(null);
  const [activeDriverRide, setActiveDriverRide] = useState<Ride | null>(null);
  const [backendPickupPoints, setBackendPickupPoints] = useState<{ lat: number; lng: number; label: string }[]>([]);
  const [notifications, setNotifications] = useState<RideNotif[]>([]);
  const [pendingPickupPulse, setPendingPickupPulse] = useState<{ lat: number; lng: number } | null>(null);
  const recenterRef = useRef<(() => void) | null>(null);
  const userLocation = useUserLocation();

  /** Format "1 hour 20 mins" → "1 h 20 min" */
  const fmtDuration = (d: string) =>
    d.replace(/\s*hours?\s*/g, " h ").replace(/\s*mins?\s*/g, " min").replace(/\s+/g, " ").trim();

  /** Normalize any time string to 24h "HH:MM" format */
  const fmtTime = (t: string | undefined) => {
    if (!t) return "";
    // Already 24h? "20:46" or "8:30"
    const m24 = t.match(/^(\d{1,2}):(\d{2})$/);
    if (m24) return `${m24[1].padStart(2, "0")}:${m24[2]}`;
    // 12h? "11:30 PM"
    const m12 = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (m12) {
      let h = parseInt(m12[1]);
      const ampm = m12[3].toUpperCase();
      if (ampm === "PM" && h !== 12) h += 12;
      if (ampm === "AM" && h === 12) h = 0;
      return `${String(h).padStart(2, "0")}:${m12[2]}`;
    }
    return t;
  };

  // Subscribe to notifications
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToNotifications(user.uid, setNotifications);
    return unsub;
  }, [user]);

  // Always track user location
  useEffect(() => {
    userLocation.startWatching();
    return () => userLocation.stopWatching();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch backend Putanje pickup points when driver has active route
  // Re-fetch when notifications change (new join request = someone picked a point)
  const fetchPickupPoints = useCallback(async () => {
    if (!user) return;
    try {
      const resp = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/api/putanje/vozac/${user.uid}`
      );
      const routes = await resp.json();
      const points: { lat: number; lng: number; label: string }[] = [];
      for (const r of routes) {
        // pairPoint can be a string or array of strings
        const pairPoints = Array.isArray(r.pairPoint) ? r.pairPoint : (r.pairPoint ? [r.pairPoint] : []);
        for (const pp of pairPoints) {
          const [lat, lng] = pp.split(", ").map(Number);
          if (!isNaN(lat) && !isNaN(lng)) {
            points.push({ lat, lng, label: "" });
          }
        }
      }
      setBackendPickupPoints(points);
    } catch { /* backend unavailable */ }
  }, [user]);

  useEffect(() => {
    if (!user || !activeRoute) return;
    fetchPickupPoints();
  }, [user, activeRoute, fetchPickupPoints]);

  // Re-fetch when a new join_request notification arrives
  useEffect(() => {
    if (!user || !activeRoute) return;
    const hasJoinRequest = notifications.some((n) => n.type === "join_request");
    if (hasJoinRequest) fetchPickupPoints();
  }, [user, activeRoute, notifications, fetchPickupPoints]);

  // Show pulsing marker for pending requests — from activeDriverRide or by fetching on notification
  useEffect(() => {
    if (activeDriverRide) {
      const pending = activeDriverRide.pendingRequests.find((r) => r.status === "pending" && r.pickupLat && r.pickupLng);
      if (pending) {
        setPendingPickupPulse({ lat: pending.pickupLat, lng: pending.pickupLng });
      } else {
        setPendingPickupPulse(null);
      }
      return;
    }
    // Fallback: if not subscribed to ride, check via notifications + fetch
    if (!user || !activeRoute) return;
    const joinNotif = notifications.find((n) => n.type === "join_request");
    if (!joinNotif) { setPendingPickupPulse(null); return; }
    (async () => {
      try {
        const { getMyRides } = await import("@/lib/rides-store");
        const rides = await getMyRides(user.uid);
        const ride = rides.find((r) => r.status === "open" || r.status === "full");
        if (ride) {
          const pending = ride.pendingRequests.find((r) => r.status === "pending" && r.pickupLat && r.pickupLng);
          if (pending) setPendingPickupPulse({ lat: pending.pickupLat, lng: pending.pickupLng });
        }
      } catch {}
    })();
  }, [activeDriverRide, user, activeRoute, notifications]);

  // Re-fetch pickup points when a new passenger is accepted (activeDriverRide changes)
  useEffect(() => {
    if (!user || !activeRoute || !activeDriverRide) return;
    const accepted = activeDriverRide.pendingRequests.filter((r) => r.status === "accepted");
    if (accepted.length === 0) return;

    (async () => {
      try {
        const resp = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/api/putanje/vozac/${user.uid}`
        );
        const routes = await resp.json();
        const points: { lat: number; lng: number; label: string }[] = [];
        for (const r of routes) {
          if (r.pairPoint && r.idPair) {
            const [lat, lng] = r.pairPoint.split(", ").map(Number);
            if (!isNaN(lat) && !isNaN(lng)) {
              points.push({ lat, lng, label: "" });
            }
          }
        }
        setBackendPickupPoints(points);
      } catch { /* backend unavailable */ }
    })();
  }, [user, activeRoute, activeDriverRide]);

  // Build route with passenger pickup waypoints for the driver
  const routeWithWaypoints = useMemo(() => {
    if (!activeRoute) return null;
    if (backendPickupPoints.length === 0) return activeRoute;
    return { ...activeRoute, waypoints: [...(activeRoute.waypoints ?? []), ...backendPickupPoints] };
  }, [activeRoute, backendPickupPoints]);

  const handleRideCancelled = useCallback((destination: string) => {
    setCancelledNotification(destination);
  }, []);

  const handleNavigate = async () => {
    if (!selectedPlace) return;
    try {
      const dest = { ...selectedPlace };
      let origin: { lat: number; lng: number };
      let originName: string;
      let originAddress: string;

      if (customOrigin && customOriginCoords) {
        origin = customOriginCoords;
        originName = customOrigin.name;
        originAddress = customOrigin.address;
      } else {
        const loc = await userLocation.request();
        origin = loc;
        originName = "Trenutna lokacija";
        originAddress = `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`;
      }

      setActiveRoute({ origin, destinationPlaceId: dest.placeId });
      userLocation.startWatching();
      setRideDestination(dest);
      setRideOriginName(originName);
      setRideOriginAddress(originAddress);
      setRideOriginLat(origin.lat);
      setRideOriginLng(origin.lng);
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ placeId: dest.placeId }, (results, status) => {
        if (status === "OK" && results?.[0]) {
          setRideDestLat(results[0].geometry.location.lat());
          setRideDestLng(results[0].geometry.location.lng());
        }
      });
      setSelectedPlace(null);
      setCustomOrigin(null);
      setCustomOriginCoords(null);
    } catch {
      // geolocation failed
    }
  };

  const handleTransit = async () => {
    if (!selectedPlace) return;
    try {
      const loc = await userLocation.request();

      // Geocode destination to get lat/lng for backend
      const geocoder = new google.maps.Geocoder();
      const geoResult = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
        geocoder.geocode({ placeId: selectedPlace.placeId }, (results, status) => {
          if (status === "OK" && results) resolve(results);
          else reject(status);
        });
      });
      const destLatLng = geoResult[0].geometry.location;

      // Fire Google Directions and backend API in parallel
      const googlePromise = new Promise<TransitRoute[]>((resolve) => {
        const directionsService = new google.maps.DirectionsService();
        directionsService.route(
          {
            origin: loc,
            destination: { placeId: selectedPlace.placeId },
            travelMode: google.maps.TravelMode.TRANSIT,
            transitOptions: { departureTime: new Date() },
            provideRouteAlternatives: true,
          },
          (result, status) => {
            if (status !== "OK" || !result) { resolve([]); return; }
            const routes: TransitRoute[] = result.routes.map((r) => {
              const leg = r.legs[0];
              const steps: TransitStep[] = leg.steps.map((step) => {
                const stepPath = step.path ?? [];
                if (step.travel_mode === "TRANSIT") {
                  const t = step.transit!;
                  return {
                    type: "TRANSIT" as const,
                    instruction: step.instructions ?? "",
                    duration: step.duration?.text ?? "",
                    distance: step.distance?.text ?? "",
                    path: stepPath,
                    lineName: t.line.name,
                    lineShortName: t.line.short_name,
                    vehicleType: t.line.vehicle?.type ?? "",
                    departureStop: t.departure_stop.name,
                    arrivalStop: t.arrival_stop.name,
                    departureTime: t.departure_time.text,
                    arrivalTime: t.arrival_time.text,
                    numStops: t.num_stops,
                    lineColor: t.line.color,
                  };
                }
                return {
                  type: "WALKING" as const,
                  instruction: step.instructions ?? "Pešači",
                  duration: step.duration?.text ?? "",
                  distance: step.distance?.text ?? "",
                  path: stepPath,
                };
              });
              return {
                duration: leg.duration?.text ?? "",
                durationSecs: leg.duration?.value ?? 0,
                departureTime: leg.departure_time?.text ?? "",
                arrivalTime: leg.arrival_time?.text ?? "",
                steps,
              };
            });
            resolve(routes);
          }
        );
      });

      const backendPromise = (async (): Promise<TransitRoute[]> => {
        try {
          const resp = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/api/route`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              origin: { lat: loc.lat, lng: loc.lng },
              destination: { lat: destLatLng.lat(), lng: destLatLng.lng() },
              departureTime: new Date().toISOString(),
              mode: "transit",
            }),
          });
          const data = await resp.json();
          if (data.error || !data.legs) return [];

          // Pre-fetch station coords for building train paths
          const stationsResp = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/api/stations`);
          const allStations: { name: string; lat: number; lng: number }[] = await stationsResp.json();
          const stationMap = new Map(allStations.map((s) => [s.name, s]));

          const steps: TransitStep[] = [];
          let totalSecs = 0;

          for (const leg of data.legs) {
            if (leg.type === "first_mile" || leg.type === "last_mile") {
              const dirs = leg.directions;
              if (!dirs) continue;
              const durSecs = dirs.durationSeconds ?? 0;
              totalSecs += durSecs;

              // Parse each sub-step from the transit directions
              for (const subStep of dirs.steps ?? []) {
                const subPath = subStep.polyline
                  ? google.maps.geometry.encoding.decodePath(subStep.polyline)
                  : [];

                if (subStep.travelMode === "TRANSIT" && subStep.transit) {
                  const t = subStep.transit;
                  steps.push({
                    type: "TRANSIT",
                    instruction: subStep.instruction ?? "",
                    duration: subStep.duration ?? "",
                    distance: subStep.distance ?? "",
                    path: subPath,
                    lineName: t.lineName,
                    lineShortName: t.lineShortName,
                    vehicleType: t.vehicleType ?? "",
                    departureStop: t.departureStop,
                    arrivalStop: t.arrivalStop,
                    departureTime: t.departureTime,
                    arrivalTime: t.arrivalTime,
                    numStops: t.numStops,
                    lineColor: t.lineColor || "#4285F4",
                  });
                } else {
                  // Walking sub-step
                  steps.push({
                    type: "WALKING",
                    instruction: subStep.instruction ?? "Pešači",
                    duration: subStep.duration ?? "",
                    distance: subStep.distance ?? "",
                    path: subPath,
                  });
                }
              }
            } else if (leg.type === "train") {
              const trainDurSecs = (leg.durationMinutes ?? 0) * 60;
              totalSecs += trainDurSecs;

              // Use the snapped rail polyline if available, fall back to straight lines
              let trainPath: google.maps.LatLng[];
              if (leg.railPolyline) {
                trainPath = google.maps.geometry.encoding.decodePath(leg.railPolyline);
              } else {
                trainPath = [];
                const boardSt = stationMap.get(leg.boardStation);
                if (boardSt) trainPath.push(new google.maps.LatLng(boardSt.lat, boardSt.lng));
                for (const stop of leg.intermediateStops ?? []) {
                  const st = stationMap.get(stop.station);
                  if (st) trainPath.push(new google.maps.LatLng(st.lat, st.lng));
                }
                const alightSt = stationMap.get(leg.alightStation);
                if (alightSt) trainPath.push(new google.maps.LatLng(alightSt.lat, alightSt.lng));
              }

              // Build intermediate stop coordinates for marker placement
              const intermediateStopCoords = (leg.intermediateStops ?? [])
                .map((s: { station: string }) => {
                  const st = stationMap.get(s.station);
                  return st ? new google.maps.LatLng(st.lat, st.lng) : null;
                })
                .filter(Boolean) as google.maps.LatLng[];

              steps.push({
                type: "TRANSIT",
                instruction: leg.description,
                duration: `${leg.durationMinutes} min`,
                distance: "",
                path: trainPath,
                lineName: leg.lineName,
                lineShortName: leg.lineId,
                vehicleType: "TRAIN",
                departureStop: leg.boardStation,
                arrivalStop: leg.alightStation,
                departureTime: leg.boardTime,
                arrivalTime: leg.alightTime,
                numStops: (leg.intermediateStops?.length ?? 0) + 2,
                lineColor: leg.lineColor ?? "#1A237E",
                intermediateStops: (leg.intermediateStops ?? []).map((s: { station: string }) => s.station),
                intermediateStopCoords,
              });
            }
          }

          // Chain times: each step starts when the previous one ends
          // Parse duration string to minutes
          const parseDurMins = (d: string): number => {
            const hm = d.match(/(\d+)\s*h\s*(\d+)/);
            if (hm) return parseInt(hm[1]) * 60 + parseInt(hm[2]);
            const m = d.match(/(\d+)/);
            return m ? parseInt(m[1]) : 0;
          };
          const parseTimeMin = (t: string): number => {
            if (!t) return -1;
            const m24 = t.match(/^(\d{1,2}):(\d{2})$/);
            if (m24) return parseInt(m24[1]) * 60 + parseInt(m24[2]);
            const m12 = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
            if (m12) {
              let h = parseInt(m12[1]);
              if (m12[3].toUpperCase() === "PM" && h !== 12) h += 12;
              if (m12[3].toUpperCase() === "AM" && h === 12) h = 0;
              return h * 60 + parseInt(m12[2]);
            }
            return -1;
          };
          const minToStr = (m: number): string => {
            const h = Math.floor(m / 60) % 24;
            const mm = m % 60;
            return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
          };

          // Find anchor: first transit step with a departure time (from the train leg, which has reliable times)
          const trainStep = steps.find((s) => s.type === "TRANSIT" && s.vehicleType === "TRAIN" && s.departureTime);
          let cursor = -1; // current time in minutes

          if (trainStep) {
            // Work backwards from train departure to fix first_mile times
            const trainDepMin = parseTimeMin(trainStep.departureTime!);
            const trainIdx = steps.indexOf(trainStep);

            // Set cursor at train departure, walk backwards
            let backCursor = trainDepMin;
            for (let i = trainIdx - 1; i >= 0; i--) {
              const s = steps[i];
              const durMin = parseDurMins(s.duration);
              if (s.type === "TRANSIT") {
                const arrMin = backCursor;
                const depMin = arrMin - durMin;
                s.departureTime = minToStr(depMin);
                s.arrivalTime = minToStr(arrMin);
                backCursor = depMin;
              } else {
                backCursor -= durMin;
              }
            }

            // Work forwards from train arrival to fix last_mile times
            const trainArrMin = parseTimeMin(trainStep.arrivalTime ?? "");
            cursor = trainArrMin >= 0 ? trainArrMin : trainDepMin + parseDurMins(trainStep.duration);

            for (let i = trainIdx + 1; i < steps.length; i++) {
              const s = steps[i];
              const durMin = parseDurMins(s.duration);
              if (s.type === "TRANSIT") {
                s.departureTime = minToStr(cursor);
                cursor += durMin;
                s.arrivalTime = minToStr(cursor);
              } else {
                cursor += durMin;
              }
            }
          }

          // Helper: parse time string in either "HH:MM" (24h) or "H:MM AM/PM" (12h) to a Date
          const parseTimeToDate = (timeStr: string): Date | null => {
            if (!timeStr) return null;
            const d = new Date();
            // Try 24h format first: "20:46", "8:30"
            const match24 = timeStr.match(/^(\d{1,2}):(\d{2})$/);
            if (match24) {
              d.setHours(parseInt(match24[1]), parseInt(match24[2]), 0, 0);
              return d;
            }
            // Try 12h format: "11:30 PM", "8:05 AM"
            const match12 = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
            if (match12) {
              let h = parseInt(match12[1]);
              const m = parseInt(match12[2]);
              const ampm = match12[3].toUpperCase();
              if (ampm === "PM" && h !== 12) h += 12;
              if (ampm === "AM" && h === 12) h = 0;
              d.setHours(h, m, 0, 0);
              return d;
            }
            return null;
          };

          const fmt24h = (d: Date) =>
            d.toLocaleTimeString("sr-Latn", { hour: "2-digit", minute: "2-digit", hour12: false });

          // Compute times from the full step sequence
          const firstTransit = steps.find((s) => s.type === "TRANSIT" && s.departureTime);
          const lastTransit = [...steps].reverse().find((s) => s.type === "TRANSIT" && s.arrivalTime);

          // Walking time before first transit
          const firstTransitIdx = steps.findIndex((s) => s.type === "TRANSIT");
          const walkBeforeSecs = steps.slice(0, Math.max(0, firstTransitIdx)).reduce(
            (sum, s) => sum + (parseInt(s.duration) || 0) * 60, 0
          );
          // Walking time after last transit
          const lastTransitIdx = steps.length - 1 - [...steps].reverse().findIndex((s) => s.type === "TRANSIT");
          const walkAfterSecs = steps.slice(lastTransitIdx + 1).reduce(
            (sum, s) => sum + (parseInt(s.duration) || 0) * 60, 0
          );

          // Compute departure = first transit departure - walk before
          let realDeparture = firstTransit?.departureTime ?? "";
          const depDate = parseTimeToDate(realDeparture);
          if (depDate && walkBeforeSecs > 0) {
            depDate.setSeconds(depDate.getSeconds() - walkBeforeSecs);
            realDeparture = fmt24h(depDate);
          } else if (depDate) {
            realDeparture = fmt24h(depDate);
          }

          // Compute arrival = last transit arrival + walk after
          let finalArrival = lastTransit?.arrivalTime ?? "";
          const arrDate = parseTimeToDate(finalArrival);
          if (arrDate && walkAfterSecs > 0) {
            arrDate.setSeconds(arrDate.getSeconds() + walkAfterSecs);
            finalArrival = fmt24h(arrDate);
          } else if (arrDate) {
            finalArrival = fmt24h(arrDate);
          }

          // Total duration
          const totalMin = Math.round(totalSecs / 60);
          const durStr = totalMin >= 60
            ? `${Math.floor(totalMin / 60)} h ${totalMin % 60} min`
            : `${totalMin} min`;

          return [{
            duration: durStr,
            durationSecs: totalSecs,
            departureTime: realDeparture,
            arrivalTime: finalArrival,
            steps,
            source: "bgvoz",
          } as TransitRoute];
        } catch {
          return [];
        }
      })();

      const [googleRoutes, trainRoutes] = await Promise.all([googlePromise, backendPromise]);

      // Merge and sort all routes by duration
      const allRoutes = [...googleRoutes, ...trainRoutes].sort(
        (a, b) => a.durationSecs - b.durationSecs
      );

      setTransitRoutes(allRoutes);
      setShowTransit(true);
    } catch {
      // geolocation failed
    }
  };

  const handleStopNavigation = () => {
    setActiveRoute(null);
    setNavigating(false);
    setRouteDuration("");
    setRouteDurationSecs(0);
    setShowRideSharePrompt(false);
    setRideDestination(null);
    setRideOriginName("");
    setRideOriginAddress("");
    setRideOriginLat(0);
    setRideOriginLng(0);
    setRideDestLat(0);
    setRideDestLng(0);
  };

  const getArrivalTime = () => {
    if (!routeDurationSecs) return "";
    const arrival = new Date(Date.now() + routeDurationSecs * 1000);
    return arrival.toLocaleTimeString("sr-Latn", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <main className="fixed inset-0">
      <APIProvider apiKey={apiKey} libraries={["geometry"]}>
        {/* Ride cancellation notification */}
        {cancelledNotification && (
          <RideNotification
            destination={cancelledNotification}
            onDismiss={() => setCancelledNotification(null)}
          />
        )}

        {/* Search bar — hidden when overlay is open */}
        {!selectedPlace && !relocating && (
          <div style={{ top: 18 }} className="absolute left-1/2 z-[1000] flex -translate-x-1/2 items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-500">
            <div className="relative">
              <Button size="icon" className="rounded-full" onClick={() => setProfileOpen(true)}>
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="" className="h-full w-full rounded-full object-cover" />
                ) : (
                  <User />
                )}
              </Button>
              {notifications.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                  {notifications.length}
                </span>
              )}
            </div>

            <SearchWithAutocomplete onPlaceSelect={setSelectedPlace} userPos={userLocation.location} />

            <Popover>
              <PopoverTrigger className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background hover:bg-gray-100">
                <SlidersHorizontal className="h-4 w-4" />
              </PopoverTrigger>
              <PopoverContent align="end" className="w-44">
                <p className="mb-3 text-sm font-medium">Filteri</p>
                <div className="flex flex-wrap gap-2">
                  {FILTERS.map((f) => (
                    <Toggle
                      key={f.id}
                      variant="outline"
                      size="sm"
                      className={`gap-2 rounded-full transition-all ${activeFilters.has(f.id) ? "border-foreground text-foreground" : "opacity-35"}`}
                      pressed={activeFilters.has(f.id)}
                      onPressedChange={(pressed) => {
                        setActiveFilters((prev) => {
                          const next = new Set(prev);
                          if (pressed) next.add(f.id);
                          else next.delete(f.id);
                          return next;
                        });
                      }}
                    >
                      <f.icon className="h-4 w-4" />
                      {f.label}
                    </Toggle>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Place overlay */}
        {selectedPlace && (
          <div className="fixed inset-0 z-[999] overflow-y-auto bg-background/95 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Close */}
            <div className="flex justify-end px-5 py-4">
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setSelectedPlace(null)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="mx-auto w-full max-w-lg space-y-4 px-5">
              {/* Origin + Destination */}
              <Card className="border-0 shadow-sm">
                <CardContent className="space-y-2 py-3">
                  {/* Origin */}
                  <div
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => { savedDestRef.current = selectedPlace; setSelectedPlace(null); setRelocatingOrigin(true); }}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                      <Navigation className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">Od</p>
                      <p className="truncate text-sm font-medium">{customOrigin?.name ?? "Trenutna lokacija"}</p>
                      {customOrigin && <p className="truncate text-xs text-muted-foreground">{customOrigin.address}</p>}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>

                  <Separator />

                  {/* Destination */}
                  <div
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => { setSelectedPlace(null); setRelocating(true); }}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100">
                      <MapPin className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">Do</p>
                      <p className="truncate text-sm font-medium">{selectedPlace.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{selectedPlace.address}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              {/* Service cards */}
              <div className="grid grid-cols-[1fr_1.2fr] gap-3">
                {/* Left column */}
                <div className="flex flex-col gap-3">
                  <Card
                    className="cursor-pointer border-0 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]"
                    onClick={handleNavigate}
                  >
                    <CardContent className="flex items-center gap-3 px-4 py-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50">
                        <Navigation className="h-5 w-5 text-primary" />
                      </div>
                      <p className="text-sm font-semibold">Navigacija</p>
                    </CardContent>
                  </Card>

                  <Card
                    className="cursor-pointer border-0 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]"
                    onClick={handleTransit}
                  >
                    <CardContent className="flex items-center gap-3 px-4 py-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                        <Train className="h-5 w-5 text-blue-600" />
                      </div>
                      <p className="text-sm font-semibold">Javni prevoz</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Right column: Car sharing */}
                <Card
                  className="cursor-pointer border-0 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]"
                  onClick={async () => {
                    if (!selectedPlace) return;
                    try {
                      const dest = { ...selectedPlace };
                      let origin: { lat: number; lng: number };
                      let oName: string;
                      let oAddr: string;

                      if (customOrigin && customOriginCoords) {
                        origin = customOriginCoords;
                        oName = customOrigin.name;
                        oAddr = customOrigin.address;
                      } else {
                        const loc = await userLocation.request();
                        origin = loc;
                        oName = "Trenutna lokacija";
                        oAddr = `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`;
                      }

                      setActiveRoute({ origin, destinationPlaceId: dest.placeId });
                      userLocation.startWatching();
                      setRideDestination(dest);
                      setRideOriginName(oName);
                      setRideOriginAddress(oAddr);
                      setRideOriginLat(origin.lat);
                      setRideOriginLng(origin.lng);
                      const geocoder = new google.maps.Geocoder();
                      geocoder.geocode({ placeId: dest.placeId }, (results, status) => {
                        if (status === "OK" && results?.[0]) {
                          setRideDestLat(results[0].geometry.location.lat());
                          setRideDestLng(results[0].geometry.location.lng());
                        }
                      });
                      setSelectedPlace(null);
                      setCustomOrigin(null);
                      setCustomOriginCoords(null);
                      setShowRideSharePrompt(true);
                    } catch { /* geolocation failed */ }
                  }}
                >
                  <CardContent className="flex h-full flex-col items-center justify-center gap-2 p-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
                      <Car className="h-6 w-6 text-emerald-600" />
                    </div>
                    <p className="text-sm font-semibold">Podeli vožnju</p>
                  </CardContent>
                </Card>
              </div>

            </div>
          </div>
        )}

        {/* Transit routes overlay */}
        {showTransit && (
          <div className="fixed inset-0 z-[999] overflow-y-auto bg-background/95 backdrop-blur-sm animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-3 px-5 py-4">
              <Button variant="ghost" size="icon-sm" className="rounded-full" onClick={() => { setShowTransit(false); setActiveTransitRoute(null); }}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1">
                <p className="text-sm font-semibold">Javni prevoz</p>
                <p className="text-xs text-muted-foreground">{selectedPlace?.name ?? ""}</p>
              </div>
              <Badge variant="secondary" className="text-[10px]">{transitRoutes.length} ruta</Badge>
            </div>

            <Separator />

            <div className="mx-auto w-full max-w-lg space-y-3 px-5 py-4">
              {transitRoutes.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">Nema dostupnih ruta</p>
              )}

              {transitRoutes.map((route, ri) => {
                const walkSteps = route.steps.filter((s) => s.type === "WALKING");
                const totalWalkMins = walkSteps.reduce((sum, s) => {
                  const m = parseInt(s.duration) || 0;
                  return sum + m;
                }, 0);

                return (
                  <Card
                    key={ri}
                    className="cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]"
                    onClick={() => { setActiveTransitRoute(route); setShowTransit(false); setSelectedPlace(null); }}
                  >
                    <CardContent className="space-y-3 py-4">
                      {/* Top row: time range + duration */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", width: "100%" }}>
                        <p className="text-base font-semibold">{fmtTime(route.departureTime)} — {fmtTime(route.arrivalTime)}</p>
                        <div className="flex items-center gap-1.5">
                          {route.source === "bgvoz" && (
                            <Badge className="rounded-full bg-[#1A237E] text-[10px] text-white hover:bg-[#1A237E]">BG Voz</Badge>
                          )}
                          <Badge variant="secondary" className="rounded-full text-xs">{fmtDuration(route.duration)}</Badge>
                        </div>
                      </div>

                      {/* Visual route bar */}
                      <div className="flex items-center gap-0.5">
                        {route.steps.map((step, si) => {
                          const weight = step.type === "WALKING" ? 1 : 3;
                          return (
                            <div
                              key={si}
                              className="h-1 rounded-full"
                              style={{
                                flex: weight,
                                backgroundColor: step.type === "WALKING" ? "#d1d5db" : (step.lineColor || "#4285F4"),
                              }}
                            />
                          );
                        })}
                      </div>

                      {/* Transit lines */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {route.steps.map((step, si) => {
                          const arrow = si > 0 ? <ChevronRight key={`a${si}`} className="h-3 w-3 text-muted-foreground/40" /> : null;

                          if (step.type === "WALKING") {
                            return (
                              <div key={si} className="flex items-center gap-1 text-muted-foreground">
                                {arrow}
                                <Footprints className="h-3 w-3" />
                                <span className="text-[11px]">{step.duration}</span>
                              </div>
                            );
                          }

                          const VehicleIcon = step.vehicleType === "BUS" ? Bus
                            : step.vehicleType === "TRAM" ? TramFront
                            : Train;

                          return (
                            <div key={si} className="flex items-center gap-1">
                              {arrow}
                              <div
                                className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium text-white"
                                style={{ backgroundColor: step.lineColor || "#4285F4" }}
                              >
                                <VehicleIcon className="h-3 w-3" />
                                {step.lineShortName || step.lineName}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Vertical progress map */}
                      <div className="relative ml-3 mt-1">
                        {route.steps.map((step, si) => {
                          if (step.type === "WALKING") {
                            return (
                              <div key={si} className="relative flex items-stretch">
                                {/* Dotted line */}
                                <div className="flex flex-col items-center" style={{ width: 20 }}>
                                  <div className="h-full w-0 border-l-2 border-dashed border-gray-300" />
                                </div>
                                <div className="flex items-center gap-2 py-2 pl-2">
                                  <Footprints className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-[11px] text-muted-foreground">Pešači {step.duration} · {step.distance}</span>
                                </div>
                              </div>
                            );
                          }

                          const color = step.lineColor || "#4285F4";
                          const VehicleIcon = step.vehicleType === "BUS" ? Bus
                            : step.vehicleType === "TRAM" ? TramFront
                            : Train;

                          return (
                            <div key={si}>
                              {/* Departure stop */}
                              <div className="relative flex items-center">
                                <div className="flex flex-col items-center" style={{ width: 20 }}>
                                  <div className="h-3 w-3 rounded-full border-2 border-white" style={{ backgroundColor: color }} />
                                </div>
                                <div className="flex items-center gap-2 pl-2">
                                  <span className="text-xs font-semibold">{fmtTime(step.departureTime)}</span>
                                  <span className="text-xs text-foreground">{step.departureStop}</span>
                                </div>
                              </div>

                              {/* Transit segment info */}
                              <div className="relative flex items-stretch">
                                <div className="flex flex-col items-center" style={{ width: 20 }}>
                                  <div className="h-full w-0.5 rounded-full" style={{ backgroundColor: color }} />
                                </div>
                                <div className="flex items-center gap-2 py-1.5 pl-2">
                                  <Badge
                                    variant="secondary"
                                    className="gap-1 px-1.5 py-0 text-[10px] font-medium text-white"
                                    style={{ backgroundColor: color }}
                                  >
                                    <VehicleIcon className="h-2.5 w-2.5" />
                                    {step.lineShortName || step.lineName}
                                  </Badge>
                                  <span className="text-[11px] text-muted-foreground">
                                    {step.numStops} stanica · {step.duration}
                                  </span>
                                </div>
                              </div>

                              {/* Arrival stop */}
                              <div className="relative flex items-center">
                                <div className="flex flex-col items-center" style={{ width: 20 }}>
                                  <div className="h-3 w-3 rounded-full border-2 border-white" style={{ backgroundColor: color }} />
                                </div>
                                <div className="flex items-center gap-2 pl-2">
                                  <span className="text-xs font-semibold">{fmtTime(step.arrivalTime)}</span>
                                  <span className="text-xs text-foreground">{step.arrivalStop}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Active transit route bottom bar */}
        {activeTransitRoute && !showTransit && !relocating && !selectedPlace && (
          <BottomBar>
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Dolazak</p>
              <p className="text-sm font-semibold text-foreground">{fmtTime(activeTransitRoute.arrivalTime)}</p>
            </div>
            <Separator orientation="vertical" className="h-6" />
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Polazak</p>
              <p className="text-sm font-semibold text-foreground">{fmtTime(activeTransitRoute.departureTime)}</p>
            </div>
            <Separator orientation="vertical" className="h-6" />
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Trajanje</p>
              <p className="text-sm font-semibold text-foreground">{activeTransitRoute.duration}</p>
            </div>
            <Separator orientation="vertical" className="h-6" />
            <Button variant="ghost" size="icon-sm" onClick={() => { setShowTransit(true); }}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => { setActiveTransitRoute(null); }}>
              <X className="h-4 w-4" />
            </Button>
          </BottomBar>
        )}

        {/* Navigation bottom bar */}
        {activeRoute && !relocating && !selectedPlace && !pickupSelectorRoute && (
          <BottomBar>
            {navigating && (
              <>
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Dolazak</p>
                  <p className="text-sm font-semibold text-foreground">{getArrivalTime()}</p>
                </div>

                <Separator orientation="vertical" className="h-6" />

                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Trajanje</p>
                  <p className="text-sm font-semibold text-foreground">
                    {routeDurationSecs > 0
                      ? (() => {
                          const h = Math.floor(routeDurationSecs / 3600);
                          const m = Math.ceil((routeDurationSecs % 3600) / 60);
                          return h > 0 ? <>{h} <span className="text-xs font-normal text-muted-foreground">h</span> {m} <span className="text-xs font-normal text-muted-foreground">min</span></> : <>{m} <span className="text-xs font-normal text-muted-foreground">min</span></>;
                        })()
                      : "—"}
                  </p>
                </div>

                <Separator orientation="vertical" className="h-6" />
              </>
            )}

            {!navigating ? (
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  setNavigating(true);
                  recenterRef.current?.();
                }}
              >
                <Navigation className="h-3.5 w-3.5" />
                Kreni
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  setNavigating(false);
                }}
              >
                <Locate className="h-4 w-4" />
              </Button>
            )}

            <Button variant="ghost" size="icon-sm" onClick={handleStopNavigation}>
              <X className="h-4 w-4" />
            </Button>
          </BottomBar>
        )}

        {/* Ride share prompt */}
        {showRideSharePrompt && activeRoute && (
          <RideSharePrompt
            onDismiss={() => setShowRideSharePrompt(false)}
            onConfirm={() => {}}
            destination={rideDestination}
            originName={rideOriginName}
            originAddress={rideOriginAddress}
            originLat={rideOriginLat}
            originLng={rideOriginLng}
            destinationLat={rideDestLat}
            destinationLng={rideDestLng}
            driverRoutePath={driverRoutePath}
            onShowPickupSelector={(routePath, onPicked) => {
              setPickupSelectorRoute(routePath);
              pickupSelectorCallbackRef.current = onPicked;
            }}
            onClearPickupSelector={() => {
              setPickupSelectorRoute(null);
              pickupSelectorCallbackRef.current = null;
            }}
            onActiveRideUpdate={setActiveDriverRide}
            onClearJoinNotifications={() => {
              notifications.filter((n) => n.type === "join_request").forEach((n) => {
                markNotificationRead(n.id);
              });
            }}
            onNavigateToPickup={(lat, lng) => {
              // Close ride share prompt and start navigation to pickup point
              setShowRideSharePrompt(false);
              if (userLocation.location) {
                // Create a temporary place ID-less navigation via geocoding the pickup coords
                const geocoder = new google.maps.Geocoder();
                geocoder.geocode({ location: { lat, lng } }, (results, status) => {
                  if (status === "OK" && results?.[0]) {
                    setActiveRoute({
                      origin: userLocation.location!,
                      destinationPlaceId: results[0].place_id,
                    });
                  }
                });
              }
            }}
          />
        )}

        {/* Join request toast — shows when driver gets a new request outside of driver-active screen */}
        {!showRideSharePrompt && notifications.filter((n) => n.type === "join_request").map((n) => (
          <JoinRequestToast
            key={n.id}
            notification={n}
            onHandled={fetchPickupPoints}
            onPickupFound={(lat, lng) => setPendingPickupPulse({ lat, lng })}
            onPickupClear={() => setPendingPickupPulse(null)}
          />
        ))}

        {/* Ride available toast — shows when a sharer gets notified that a driver appeared */}
        {notifications.filter((n) => n.type === "ride_available").map((n) => (
          <RideAvailableToast
            key={n.id}
            notification={n}
            onViewRide={() => {
              setShowRideSharePrompt(true);
            }}
          />
        ))}

        {/* Points toast */}
        {pointsToast && (
          <div className="fixed bottom-20 left-1/2 z-[1200] -translate-x-1/2 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg">
              <Star className="h-4 w-4 text-amber-300" />
              +10 bodova!
            </div>
          </div>
        )}

        {/* Profile sheet */}
        <ProfileSheet
          open={profileOpen}
          onClose={() => setProfileOpen(false)}
          onRideCancelled={handleRideCancelled}
          notifications={notifications}
          onSelectRide={(ride) => {
            // Start navigation to the ride's destination
            if (!userLocation.location) {
              userLocation.request().then((loc) => {
                setActiveRoute({
                  origin: loc,
                  destinationPlaceId: ride.destinationPlaceId,
                });
                userLocation.startWatching();
              });
            } else {
              setActiveRoute({
                origin: userLocation.location,
                destinationPlaceId: ride.destinationPlaceId,
              });
              userLocation.startWatching();
            }
            // Clear any existing overlays
            setSelectedPlace(null);
            setActiveTransitRoute(null);
            setShowTransit(false);
          }}
          onNavigationStop={handleStopNavigation}
        />

        {/* Map */}
        <GoogleMap
          defaultCenter={BELGRADE}
          defaultZoom={13}
          gestureHandling="greedy"
          disableDefaultUI
          style={{ width: "100%", height: "100%" }}
        >
          <MapStyler />
          <DroppablePin
            onPlaceSelect={setSelectedPlace}
            enabled={!selectedPlace && !activeRoute && !activeTransitRoute && !showTransit && !relocating && !reportingProblem && !postingParking}
          />
          {relocating && (
            <RelocateOverlay
              onConfirm={(place) => {
                setRelocating(false);
                setActiveRoute(null);
                setActiveTransitRoute(null);
                setRouteDuration("");
                setRouteDurationSecs(0);
                setSelectedPlace(place);
              }}
              onCancel={() => setRelocating(false)}
            />
          )}
          {relocatingOrigin && (
            <RelocateOverlay
              onConfirm={(place) => {
                setRelocatingOrigin(false);
                setCustomOrigin(place);
                const geocoder = new google.maps.Geocoder();
                geocoder.geocode({ placeId: place.placeId }, (results, status) => {
                  if (status === "OK" && results?.[0]) {
                    setCustomOriginCoords({
                      lat: results[0].geometry.location.lat(),
                      lng: results[0].geometry.location.lng(),
                    });
                  }
                });
                setSelectedPlace(savedDestRef.current);
              }}
              onCancel={() => {
                setRelocatingOrigin(false);
                setSelectedPlace(savedDestRef.current);
              }}
            />
          )}
          <MapRecenter userPos={userLocation.location} recenterRef={recenterRef} />
          {userLocation.location && (
            <UserLocationMarker pos={userLocation.location} heading={userLocation.heading} />
          )}
          {routeWithWaypoints && !pickupSelectorRoute && (
            <LiveNavigation
              route={routeWithWaypoints}
              userPos={userLocation.location}
              heading={userLocation.heading}
              followUser={navigating}
              onDurationUpdate={(d, s) => { setRouteDuration(d); setRouteDurationSecs(s); }}
              onRouteReady={setDriverRoutePath}
            />
          )}
          {activeTransitRoute && !showTransit && !pickupSelectorRoute && (
            <TransitRouteRenderer route={activeTransitRoute} />
          )}
          {pickupSelectorRoute && (
            <PickupSelector
              routePath={pickupSelectorRoute}
              onPickupSelected={(lat, lng) => pickupSelectorCallbackRef.current?.(lat, lng)}
            />
          )}
          <CameraMarkers
            visible={activeFilters.has("cameras") && !pickupSelectorRoute}
            onCameraClick={setActiveCamera}
          />
          <ProblemMarkers visible={activeFilters.has("problems") && !pickupSelectorRoute} />
          <ParkingMarkers visible={activeFilters.has("parking") && !pickupSelectorRoute} />
          {pendingPickupPulse && (
            <PulsingPickupMarker lat={pendingPickupPulse.lat} lng={pendingPickupPulse.lng} />
          )}
          <ReportPinDrop
            active={reportingProblem && !pickupSelectorRoute}
            pinPlaced={!!reportPinLocation}
            onPinDrop={(lat, lng) => setReportPinLocation({ lat, lng })}
          />
          <ReportPinDrop
            active={postingParking && !pickupSelectorRoute}
            pinPlaced={!!parkingPinLocation}
            onPinDrop={(lat, lng) => setParkingPinLocation({ lat, lng })}
          />
        </GoogleMap>

        {/* Camera video popover */}
        {activeCamera && (
          <CameraPopover camera={activeCamera} onClose={() => setActiveCamera(null)} />
        )}

        {/* Action buttons — report problem + post parking */}
        {!reportingProblem && !reportPinLocation && !postingParking && !parkingPinLocation && !selectedPlace && !relocating && !showTransit && !activeTransitRoute && !activeRoute && (
          <div className="fixed bottom-6 right-4 z-[1000] flex flex-col gap-3">
            <Button
              size="icon"
              className="h-12 w-12 rounded-full bg-blue-500 shadow-xl shadow-blue-500/25 hover:bg-blue-600 hover:shadow-blue-500/40 transition-all hover:-translate-y-0.5 active:scale-95"
              onClick={() => setPostingParking(true)}
            >
              <ParkingCircle className="h-5 w-5 text-white" />
            </Button>
            <Button
              size="icon"
              className="h-12 w-12 rounded-full bg-amber-500 shadow-xl shadow-amber-500/25 hover:bg-amber-600 hover:shadow-amber-500/40 transition-all hover:-translate-y-0.5 active:scale-95"
              onClick={() => setReportingProblem(true)}
            >
              <AlertTriangle className="h-5 w-5 text-white" />
            </Button>
          </div>
        )}

        {/* Pin-drop mode message */}
        {reportingProblem && !reportPinLocation && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[1100]">
            <Card className="shadow-xl">
              <CardContent className="flex items-center gap-3 py-3">
                <MapPin className="h-4 w-4 text-amber-500 shrink-0" />
                <p className="text-sm font-medium">Postavi pin na mapu</p>
                <Button variant="ghost" size="icon-xs" onClick={() => setReportingProblem(false)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Report form after pin is placed */}
        {reportPinLocation && (
          <ReportProblemForm
            lat={reportPinLocation.lat}
            lng={reportPinLocation.lng}
            onClose={() => {
              setReportPinLocation(null);
              setReportingProblem(false);
            }}
            onSubmitted={() => {
              setReportPinLocation(null);
              setReportingProblem(false);
            }}
          />
        )}

        {/* Parking pin-drop mode message */}
        {postingParking && !parkingPinLocation && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[1100]">
            <Card className="shadow-xl">
              <CardContent className="flex items-center gap-3 py-3">
                <ParkingCircle className="h-4 w-4 text-blue-500 shrink-0" />
                <p className="text-sm font-medium">Postavi pin gde je parking</p>
                <Button variant="ghost" size="icon-xs" onClick={() => setPostingParking(false)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Parking form after pin is placed */}
        {parkingPinLocation && (
          <ParkingForm
            lat={parkingPinLocation.lat}
            lng={parkingPinLocation.lng}
            onClose={() => {
              setParkingPinLocation(null);
              setPostingParking(false);
            }}
            onSubmitted={() => {
              setParkingPinLocation(null);
              setPostingParking(false);
            }}
          />
        )}
      </APIProvider>
    </main>
  );
}
