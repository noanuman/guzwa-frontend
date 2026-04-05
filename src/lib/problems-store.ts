"use client";

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  arrayUnion,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface RoadProblem {
  id: string;
  reporterId: string;
  reporterName: string;
  reporterPhoto: string;
  description: string;
  photoUrl: string;
  lat: number;
  lng: number;
  status: "pending" | "confirmed" | "resolved";
  confirmedBy: string[];
  createdAt: Timestamp;
}

const CONFIRMATIONS_NEEDED = 3;
const problemsCol = () => collection(db, "road_problems");

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function docToProblem(
  snap: import("firebase/firestore").DocumentSnapshot
): RoadProblem {
  const d = snap.data()!;
  return {
    id: snap.id,
    reporterId: d.reporterId ?? "",
    reporterName: d.reporterName ?? "",
    reporterPhoto: d.reporterPhoto ?? "",
    description: d.description ?? "",
    photoUrl: d.photoUrl ?? "",
    lat: d.lat ?? 0,
    lng: d.lng ?? 0,
    status: d.status ?? "pending",
    confirmedBy: d.confirmedBy ?? [],
    createdAt: d.createdAt ?? Timestamp.now(),
  };
}

/* ------------------------------------------------------------------ */
/*  Photo upload                                                       */
/* ------------------------------------------------------------------ */

export async function uploadProblemPhoto(file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `road_problems/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

/* ------------------------------------------------------------------ */
/*  CRUD                                                               */
/* ------------------------------------------------------------------ */

export interface ReportProblemData {
  reporterName: string;
  reporterPhoto: string;
  description: string;
  photoUrl: string;
  lat: number;
  lng: number;
}

export async function reportProblem(
  userId: string,
  data: ReportProblemData
): Promise<string> {
  const docRef = await addDoc(problemsCol(), {
    reporterId: userId,
    reporterName: data.reporterName,
    reporterPhoto: data.reporterPhoto,
    description: data.description,
    photoUrl: data.photoUrl,
    lat: data.lat,
    lng: data.lng,
    status: "pending",
    confirmedBy: [userId], // reporter counts as first confirmation
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function confirmProblem(
  problemId: string,
  userId: string
): Promise<void> {
  const docRef = doc(db, "road_problems", problemId);
  const snap = await getDocs(
    query(problemsCol(), where("__name__", "==", problemId))
  );
  if (snap.empty) throw new Error("Problem not found");

  const problem = docToProblem(snap.docs[0]);
  if (problem.confirmedBy.includes(userId))
    throw new Error("Already confirmed");

  const newCount = problem.confirmedBy.length + 1;
  const updates: Record<string, unknown> = {
    confirmedBy: arrayUnion(userId),
  };

  if (newCount >= CONFIRMATIONS_NEEDED && problem.status === "pending") {
    updates.status = "confirmed";
  }

  await updateDoc(docRef, updates);
}

export async function resolveProblem(
  problemId: string,
  userId: string
): Promise<void> {
  const docRef = doc(db, "road_problems", problemId);
  await updateDoc(docRef, { status: "resolved" });
}

/* ------------------------------------------------------------------ */
/*  Fetch                                                              */
/* ------------------------------------------------------------------ */

export async function getActiveProblems(): Promise<RoadProblem[]> {
  const q = query(
    problemsCol(),
    where("status", "in", ["pending", "confirmed"]),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(docToProblem);
}

export function subscribeToProblems(
  callback: (problems: RoadProblem[]) => void
): Unsubscribe {
  const q = query(
    problemsCol(),
    where("status", "in", ["pending", "confirmed"]),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(docToProblem));
  });
}
