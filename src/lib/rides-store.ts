"use client";

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  arrayUnion,
  arrayRemove,
  increment,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/* ------------------------------------------------------------------ */
/*  Notifications                                                      */
/* ------------------------------------------------------------------ */

export interface RideNotification {
  id: string;
  userId: string;
  type: "join_request" | "request_accepted" | "request_declined" | "ride_cancelled" | "ride_available";
  message: string;
  rideId: string;
  read: boolean;
  createdAt: Timestamp;
}

export async function sendNotification(userId: string, type: RideNotification["type"], message: string, rideId: string) {
  await addDoc(collection(db, "notifications"), {
    userId,
    type,
    message,
    rideId,
    read: false,
    createdAt: serverTimestamp(),
  });
}

export function subscribeToNotifications(
  userId: string,
  callback: (notifications: RideNotification[]) => void
): Unsubscribe {
  const q = query(
    collection(db, "notifications"),
    where("userId", "==", userId),
    where("read", "==", false)
  );
  return onSnapshot(q, (snap) => {
    const notifs = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as RideNotification))
      .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
    callback(notifs);
  }, (err) => {
    console.error("Notifications subscription error:", err);
    callback([]);
  });
}

export async function markNotificationRead(notifId: string) {
  await updateDoc(doc(db, "notifications", notifId), { read: true });
}

async function awardPoints(userId: string, points: number) {
  const userRef = doc(db, "users", userId);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    await updateDoc(userRef, { points: increment(points) });
  } else {
    await setDoc(userRef, { points });
  }
}

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

/* ------------------------------------------------------------------ */
/*  Ride requests (sharer waiting for a driver)                        */
/* ------------------------------------------------------------------ */

export interface RideRequest {
  id: string;
  userId: string;
  userName: string;
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  destinationName: string;
  date: string;
  time: string;
  createdAt: Timestamp;
}

const rideRequestsCol = () => collection(db, "ride_requests");

export async function saveRideRequest(
  userId: string,
  data: {
    userName: string;
    originLat: number;
    originLng: number;
    destinationLat: number;
    destinationLng: number;
    destinationName: string;
    date: string;
    time: string;
  }
): Promise<string> {
  // Remove any existing request from this user first
  const existing = await getDocs(query(rideRequestsCol(), where("userId", "==", userId)));
  for (const d of existing.docs) await deleteDoc(d.ref);

  const ref = await addDoc(rideRequestsCol(), {
    userId,
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function removeRideRequest(userId: string): Promise<void> {
  const existing = await getDocs(query(rideRequestsCol(), where("userId", "==", userId)));
  for (const d of existing.docs) await deleteDoc(d.ref);
}

/** Called by the driver after creating a ride — find waiting sharers nearby */
export async function notifyWaitingSharers(
  driverId: string,
  driverName: string,
  rideId: string,
  destLat: number,
  destLng: number
): Promise<void> {
  const snap = await getDocs(rideRequestsCol());
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;

  for (const d of snap.docs) {
    const req = d.data();
    if (req.userId === driverId) continue;

    // Haversine check — within 3km of destination
    const dLat = toRad(destLat - req.destinationLat);
    const dLng = toRad(destLng - req.destinationLng);
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(req.destinationLat)) * Math.cos(toRad(destLat)) * Math.sin(dLng / 2) ** 2;
    const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    if (dist <= 3) {
      await sendNotification(
        req.userId,
        "ride_available",
        `Vozač ${driverName} nudi vožnju do ${req.destinationName}`,
        rideId
      );
    }
  }
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

  // Notify driver
  await sendNotification(
    ride.driverId,
    "join_request",
    `${data.name} želi da se pridruži tvojoj vožnji`,
    rideId
  );
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

  // Award 3 points to driver for giving a ride
  await awardPoints(driverUserId, 3);

  // Confirm backend pairing with pickup point
  if (request.pickupLat && request.pickupLng) {
    try {
      const resp = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/api/putanje/vozac/${driverUserId}`
      );
      const routes = await resp.json();
      // Find a route that this passenger hasn't been paired to yet
      const route = routes.find((r: Record<string, unknown>) => {
        const paired = Array.isArray(r.idPair) ? r.idPair : (r.idPair ? [r.idPair] : []);
        return !paired.includes(requesterUid);
      });
      if (route) {
        await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/api/potvrdiPar`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              putanjaId: route.id,
              id_putnika: requesterUid,
              datumPutnik: new Date().toISOString().split("T")[0],
              pickupLat: request.pickupLat,
              pickupLng: request.pickupLng,
            }),
          }
        );
      }
    } catch { /* backend unavailable */ }
  }

  // Notify passenger they were accepted
  await sendNotification(
    requesterUid,
    "request_accepted",
    `Vozač ${ride.driverName} je prihvatio tvoj zahtev`,
    rideId
  );
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

  // Notify passenger they were declined
  await sendNotification(
    requesterUid,
    "request_declined",
    `Vozač je odbio tvoj zahtev za vožnju`,
    rideId
  );
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

  // Notify all passengers and pending requesters
  for (const p of ride.passengers) {
    await sendNotification(p.uid, "ride_cancelled", `Vožnja do ${ride.destinationName} je otkazana`, rideId);
  }
  for (const r of ride.pendingRequests) {
    if (r.status === "pending") {
      await sendNotification(r.uid, "ride_cancelled", `Vožnja do ${ride.destinationName} je otkazana`, rideId);
    }
  }

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

export async function getUserPoints(userId: string): Promise<number> {
  const userRef = doc(db, "users", userId);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return 0;
  return snap.data()?.points ?? 0;
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
