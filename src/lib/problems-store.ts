"use client";

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  arrayUnion,
  increment,
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
  likes: string[];
  reports: string[];
  createdAt: Timestamp;
}

export const LIKES_FOR_REWARD = 3;
export const REPORTS_TO_DELETE = 3;

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
    likes: d.likes ?? [],
    reports: d.reports ?? [],
    createdAt: d.createdAt ?? Timestamp.now(),
  };
}

/* ------------------------------------------------------------------ */
/*  Photo upload                                                       */
/* ------------------------------------------------------------------ */

export async function uploadProblemPhoto(file: File): Promise<string> {
  // Try Firebase Storage first, fall back to base64
  try {
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `road_problems/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  } catch {
    // Fallback: convert to base64 data URL (max ~1MB for Firestore)
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  }
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
    likes: [],
    reports: [],
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function likeProblem(
  problemId: string,
  userId: string
): Promise<void> {
  const docRef = doc(db, "road_problems", problemId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error("Problem not found");

  const problem = docToProblem(snap);
  if (problem.likes.includes(userId)) throw new Error("Already liked");

  await updateDoc(docRef, { likes: arrayUnion(userId) });

  // Award 3 points to the reporter when the pin reaches 3 likes
  const newLikeCount = problem.likes.length + 1;
  if (newLikeCount === LIKES_FOR_REWARD && problem.reporterId) {
    const userRef = doc(db, "users", problem.reporterId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      await updateDoc(userRef, { points: increment(1) });
    } else {
      await setDoc(userRef, { points: 1 });
    }
  }
}

export async function reportProblemAbuse(
  problemId: string,
  userId: string
): Promise<void> {
  const docRef = doc(db, "road_problems", problemId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error("Problem not found");

  const problem = docToProblem(snap);
  if (problem.reports.includes(userId)) throw new Error("Already reported");

  const newReportCount = problem.reports.length + 1;
  if (newReportCount >= REPORTS_TO_DELETE) {
    await deleteDoc(docRef);
  } else {
    await updateDoc(docRef, { reports: arrayUnion(userId) });
  }
}

/* ------------------------------------------------------------------ */
/*  Fetch                                                              */
/* ------------------------------------------------------------------ */

export async function getActiveProblems(): Promise<RoadProblem[]> {
  const q = query(problemsCol(), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(docToProblem);
}

export function subscribeToProblems(
  callback: (problems: RoadProblem[]) => void
): Unsubscribe {
  const q = query(problemsCol(), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(docToProblem));
  }, (err) => {
    console.error("Problems subscription error:", err);
    // Fallback: fetch without ordering
    getDocs(collection(db, "road_problems")).then((snap) => {
      callback(snap.docs.map(docToProblem));
    }).catch(() => callback([]));
  });
}
