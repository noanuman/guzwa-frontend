"use client";

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  setDoc,
  onSnapshot,
  Timestamp,
  increment,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ParkingSpot {
  id: string;
  ownerId: string;
  ownerName: string;
  description: string;
  phone: string;
  photo: string;
  availableFrom: string; // "HH:MM"
  availableUntil: string; // "HH:MM"
  lat: number;
  lng: number;
  reservedBy: string | null;
  reservedByName: string | null;
  createdAt: Timestamp;
}

const RESERVE_COST = 3;
const OWNER_REWARD = 3;

const parkingCol = () => collection(db, "parking_spots");

function docToSpot(snap: import("firebase/firestore").DocumentSnapshot): ParkingSpot {
  const d = snap.data()!;
  return {
    id: snap.id,
    ownerId: d.ownerId ?? "",
    ownerName: d.ownerName ?? "",
    description: d.description ?? "",
    phone: d.phone ?? "",
    photo: d.photo ?? "",
    availableFrom: d.availableFrom ?? "",
    availableUntil: d.availableUntil ?? "",
    lat: d.lat ?? 0,
    lng: d.lng ?? 0,
    reservedBy: d.reservedBy ?? null,
    reservedByName: d.reservedByName ?? null,
    createdAt: d.createdAt ?? Timestamp.now(),
  };
}

/* ------------------------------------------------------------------ */
/*  CRUD                                                               */
/* ------------------------------------------------------------------ */

export async function createParkingSpot(
  userId: string,
  data: {
    ownerName: string;
    description: string;
    phone: string;
    photo: string;
    availableFrom: string;
    availableUntil: string;
    lat: number;
    lng: number;
  }
): Promise<string> {
  const ref = await addDoc(parkingCol(), {
    ownerId: userId,
    ownerName: data.ownerName,
    description: data.description,
    phone: data.phone,
    photo: data.photo,
    availableFrom: data.availableFrom,
    availableUntil: data.availableUntil,
    lat: data.lat,
    lng: data.lng,
    reservedBy: null,
    reservedByName: null,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function reserveParkingSpot(
  spotId: string,
  userId: string,
  userName: string
): Promise<void> {
  const spotRef = doc(db, "parking_spots", spotId);
  const snap = await getDoc(spotRef);
  if (!snap.exists()) throw new Error("Spot not found");

  const spot = docToSpot(snap);
  if (spot.reservedBy) throw new Error("Already reserved");
  if (spot.ownerId === userId) throw new Error("Cannot reserve your own spot");

  // Check user has enough points
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);
  const userPoints = userSnap.exists() ? (userSnap.data()?.points ?? 0) : 0;
  if (userPoints < RESERVE_COST) throw new Error("Not enough points");

  // Deduct points from reserver
  await updateDoc(userRef, { points: increment(-RESERVE_COST) });

  // Award points to owner
  const ownerRef = doc(db, "users", spot.ownerId);
  const ownerSnap = await getDoc(ownerRef);
  if (ownerSnap.exists()) {
    await updateDoc(ownerRef, { points: increment(OWNER_REWARD) });
  } else {
    await setDoc(ownerRef, { points: OWNER_REWARD });
  }

  // Mark spot as reserved
  await updateDoc(spotRef, { reservedBy: userId, reservedByName: userName });
}

export async function removeParkingSpot(
  spotId: string,
  userId: string
): Promise<void> {
  const spotRef = doc(db, "parking_spots", spotId);
  const snap = await getDoc(spotRef);
  if (!snap.exists()) throw new Error("Spot not found");
  const spot = docToSpot(snap);
  if (spot.ownerId !== userId) throw new Error("Only the owner can remove");
  await deleteDoc(spotRef);
}

/* ------------------------------------------------------------------ */
/*  Subscribe                                                          */
/* ------------------------------------------------------------------ */

export function subscribeToParkingSpots(
  callback: (spots: ParkingSpot[]) => void
): Unsubscribe {
  return onSnapshot(parkingCol(), (snap) => {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const spots = snap.docs
      .map(docToSpot)
      .filter((s) => s.availableUntil >= currentTime); // hide expired

    callback(spots);
  }, () => callback([]));
}
