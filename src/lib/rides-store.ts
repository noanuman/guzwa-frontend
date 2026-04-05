"use client";

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface RidePassenger {
  uid: string;
  name: string;
  photo: string;
  joinedAt: Timestamp;
}

export interface JoinRequest {
  uid: string;
  name: string;
  photo: string;
  pickupName: string;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  destinationName: string;
  destinationAddress: string;
  status: "pending" | "accepted" | "declined";
  requestedAt: Timestamp;
}

export interface Ride {
  id: string;
  driverId: string;
  driverName: string;
  driverPhoto: string;
  destinationName: string;
  destinationAddress: string;
  destinationPlaceId: string;
  originName: string;
  originAddress: string;
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  scheduledAt: Timestamp;
  createdAt: Timestamp;
  status: "open" | "full" | "in_progress" | "completed" | "cancelled";
  maxPassengers: number;
  passengers: RidePassenger[];
  pendingRequests: JoinRequest[];
  pointsPerPerson: number;
  routePath: { lat: number; lng: number }[];
}

/** Backward-compat alias used by older imports */
export type ScheduledRide = Ride;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const ridesCol = () => collection(db, "rides");

function docToRide(snap: import("firebase/firestore").DocumentSnapshot): Ride {
  const d = snap.data()!;
  return {
    id: snap.id,
    driverId: d.driverId ?? "",
    driverName: d.driverName ?? "",
    driverPhoto: d.driverPhoto ?? "",
    destinationName: d.destinationName ?? "",
    destinationAddress: d.destinationAddress ?? "",
    destinationPlaceId: d.destinationPlaceId ?? "",
    originName: d.originName ?? "",
    originAddress: d.originAddress ?? "",
    originLat: d.originLat ?? 0,
    originLng: d.originLng ?? 0,
    destinationLat: d.destinationLat ?? 0,
    destinationLng: d.destinationLng ?? 0,
    scheduledAt: d.scheduledAt ?? Timestamp.now(),
    createdAt: d.createdAt ?? Timestamp.now(),
    status: d.status ?? "open",
    maxPassengers: d.maxPassengers ?? 4,
    passengers: d.passengers ?? [],
    pendingRequests: d.pendingRequests ?? [],
    pointsPerPerson: d.pointsPerPerson ?? 10,
    routePath: d.routePath ?? [],
  };
}

/* ------------------------------------------------------------------ */
/*  CRUD functions                                                     */
/* ------------------------------------------------------------------ */

export interface CreateRideData {
  driverName: string;
  driverPhoto: string;
  destinationName: string;
  destinationAddress: string;
  destinationPlaceId: string;
  originName: string;
  originAddress: string;
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  scheduledAt: Date;
  maxPassengers?: number;
  routePath?: { lat: number; lng: number }[];
}

export async function createRide(
  userId: string,
  data: CreateRideData
): Promise<string> {
  const ref = await addDoc(ridesCol(), {
    driverId: userId,
    driverName: data.driverName,
    driverPhoto: data.driverPhoto,
    destinationName: data.destinationName,
    destinationAddress: data.destinationAddress,
    destinationPlaceId: data.destinationPlaceId,
    originName: data.originName,
    originAddress: data.originAddress,
    originLat: data.originLat,
    originLng: data.originLng,
    destinationLat: data.destinationLat,
    destinationLng: data.destinationLng,
    scheduledAt: Timestamp.fromDate(data.scheduledAt),
    createdAt: serverTimestamp(),
    status: "open",
    maxPassengers: data.maxPassengers ?? 4,
    passengers: [],
    pendingRequests: [],
    pointsPerPerson: 10,
    routePath: data.routePath ?? [],
  });
  return ref.id;
}

export async function joinRide(
  rideId: string,
  userId: string,
  userData: { name: string; photo: string }
): Promise<void> {
  const ref = doc(db, "rides", rideId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Ride not found");
  const ride = docToRide(snap);
  if (ride.status !== "open") throw new Error("Ride is not open");
  if (ride.passengers.some((p) => p.uid === userId))
    throw new Error("Already joined");

  const passenger: RidePassenger = {
    uid: userId,
    name: userData.name,
    photo: userData.photo,
    joinedAt: Timestamp.now(),
  };

  const updates: Record<string, unknown> = {
    passengers: arrayUnion(passenger),
  };

  // If ride becomes full, update status
  if (ride.passengers.length + 1 >= ride.maxPassengers) {
    updates.status = "full";
  }

  await updateDoc(ref, updates);
}

export async function leaveRide(
  rideId: string,
  userId: string
): Promise<void> {
  const ref = doc(db, "rides", rideId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Ride not found");
  const ride = docToRide(snap);
  const passenger = ride.passengers.find((p) => p.uid === userId);
  if (!passenger) throw new Error("Not a passenger");

  await updateDoc(ref, {
    passengers: arrayRemove(passenger),
    status: "open", // re-open if someone leaves
  });
}

/* ------------------------------------------------------------------ */
/*  Join request flow                                                  */
/* ------------------------------------------------------------------ */

export interface RequestToJoinData {
  name: string;
  photo: string;
  pickupName: string;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  destinationName: string;
  destinationAddress: string;
}

export async function requestToJoin(
  rideId: string,
  userId: string,
  data: RequestToJoinData
): Promise<void> {
  const ref = doc(db, "rides", rideId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Ride not found");
  const ride = docToRide(snap);
  if (ride.status !== "open") throw new Error("Ride is not open");
  if (ride.driverId === userId) throw new Error("Cannot request your own ride");
  if (ride.pendingRequests.some((r) => r.uid === userId))
    throw new Error("Already requested");
  if (ride.passengers.some((p) => p.uid === userId))
    throw new Error("Already a passenger");

  const request: JoinRequest = {
    uid: userId,
    name: data.name,
    photo: data.photo,
    pickupName: data.pickupName,
    pickupAddress: data.pickupAddress,
    pickupLat: data.pickupLat,
    pickupLng: data.pickupLng,
    destinationName: data.destinationName,
    destinationAddress: data.destinationAddress,
    status: "pending",
    requestedAt: Timestamp.now(),
  };

  await updateDoc(ref, { pendingRequests: arrayUnion(request) });
}

export async function acceptJoinRequest(
  rideId: string,
  driverUserId: string,
  requesterUid: string
): Promise<void> {
  const ref = doc(db, "rides", rideId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Ride not found");
  const ride = docToRide(snap);
  if (ride.driverId !== driverUserId) throw new Error("Only the driver can accept");

  const request = ride.pendingRequests.find(
    (r) => r.uid === requesterUid && r.status === "pending"
  );
  if (!request) throw new Error("Request not found");

  // Remove old request, add updated one + add as passenger
  const updatedRequest = { ...request, status: "accepted" as const };
  const passenger: RidePassenger = {
    uid: request.uid,
    name: request.name,
    photo: request.photo,
    joinedAt: Timestamp.now(),
  };

  await updateDoc(ref, { pendingRequests: arrayRemove(request) });
  const updates: Record<string, unknown> = {
    pendingRequests: arrayUnion(updatedRequest),
    passengers: arrayUnion(passenger),
  };
  if (ride.passengers.length + 1 >= ride.maxPassengers) {
    updates.status = "full";
  }
  await updateDoc(ref, updates);
}

export async function declineJoinRequest(
  rideId: string,
  driverUserId: string,
  requesterUid: string
): Promise<void> {
  const ref = doc(db, "rides", rideId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Ride not found");
  const ride = docToRide(snap);
  if (ride.driverId !== driverUserId) throw new Error("Only the driver can decline");

  const request = ride.pendingRequests.find(
    (r) => r.uid === requesterUid && r.status === "pending"
  );
  if (!request) throw new Error("Request not found");

  const updatedRequest = { ...request, status: "declined" as const };
  await updateDoc(ref, { pendingRequests: arrayRemove(request) });
  await updateDoc(ref, { pendingRequests: arrayUnion(updatedRequest) });
}

export async function cancelRide(
  rideId: string,
  userId: string
): Promise<void> {
  const ref = doc(db, "rides", rideId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Ride not found");
  const ride = docToRide(snap);
  if (ride.driverId !== userId) throw new Error("Only the driver can cancel");
  await deleteDoc(ref);

  // Delete all driver's routes from backend Putanje so they can't be matched anymore
  try {
    const resp = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/api/putanje/vozac/${userId}`
    );
    const routes = await resp.json();
    for (const r of routes) {
      await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/api/putanja/${r.id}`,
        { method: "DELETE" }
      );
    }
  } catch { /* backend unavailable */ }
}

export async function getMyRides(userId: string): Promise<Ride[]> {
  const q = query(
    ridesCol(),
    where("driverId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(docToRide);
}

export async function getJoinedRides(userId: string): Promise<Ride[]> {
  // Firestore doesn't support array-contains on nested fields easily,
  // so we fetch all non-cancelled rides and filter client-side
  const q = query(ridesCol(), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs
    .map(docToRide)
    .filter((r) => r.passengers.some((p) => p.uid === userId));
}

/** Haversine distance in km between two lat/lng points */
function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const MAX_DESTINATION_RADIUS_KM = 3;

export async function getAvailableRides(
  destLat?: number,
  destLng?: number,
  destinationPlaceId?: string,
): Promise<Ride[]> {
  const q = query(
    ridesCol(),
    where("status", "==", "open"),
    orderBy("scheduledAt", "asc")
  );
  const snap = await getDocs(q);
  let rides = snap.docs.map(docToRide);

  // Filter by proximity to destination if coordinates are provided
  if (destLat && destLng) {
    rides = rides
      .map((r) => {
        const dist = (r.destinationLat && r.destinationLng)
          ? haversineKm(destLat, destLng, r.destinationLat, r.destinationLng)
          : Infinity;
        return { ...r, _distKm: dist };
      })
      .filter((r) => r._distKm <= MAX_DESTINATION_RADIUS_KM)
      .sort((a, b) => a._distKm - b._distKm)
      .map(({ _distKm, ...r }) => r as Ride);
  } else if (destinationPlaceId) {
    // Fallback: exact placeId match for backward compat
    rides = rides.filter((r) => r.destinationPlaceId === destinationPlaceId);
  }

  return rides;
}

export function subscribeToRide(
  rideId: string,
  callback: (ride: Ride | null) => void
): Unsubscribe {
  const ref = doc(db, "rides", rideId);
  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    callback(docToRide(snap));
  });
}

export async function getUserPoints(_userId: string): Promise<number> {
  // Points system disabled for now
  return 0;
}

/* ------------------------------------------------------------------ */
/*  Backward-compat wrappers (used by older code)                      */
/* ------------------------------------------------------------------ */

/** @deprecated Use createRide() instead */
export async function addRide(
  userId: string,
  data: {
    destinationName: string;
    destinationAddress: string;
    destinationPlaceId: string;
    scheduledAt: string;
    originName?: string;
    originAddress?: string;
    driverName?: string;
    driverPhoto?: string;
  }
): Promise<string> {
  return createRide(userId, {
    driverName: data.driverName ?? "Anonimno",
    driverPhoto: data.driverPhoto ?? "",
    destinationName: data.destinationName,
    destinationAddress: data.destinationAddress,
    destinationPlaceId: data.destinationPlaceId,
    originName: data.originName ?? "",
    originAddress: data.originAddress ?? "",
    originLat: 0,
    originLng: 0,
    destinationLat: 0,
    destinationLng: 0,
    scheduledAt: new Date(data.scheduledAt),
  });
}

/** @deprecated Use getMyRides() instead */
export async function getRides(userId: string): Promise<Ride[]> {
  return getMyRides(userId);
}

/** @deprecated Use getUserPoints() instead */
export async function getTotalPoints(userId: string): Promise<number> {
  return getUserPoints(userId);
}

/** @deprecated No-op with Firestore */
export function clearAll() {
  // No-op — data lives in Firestore now
}
