/**
 * Seed Firestore with BG Voz train data.
 * Run: node scripts/seed-bgvoz.mjs
 */

import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBLFaXuZdWymqsCFUOm5AXUcScAQU7-Z7c",
  authDomain: "guzwa-fa08a.firebaseapp.com",
  projectId: "guzwa-fa08a",
  storageBucket: "guzwa-fa08a.firebasestorage.app",
  messagingSenderId: "44176577069",
  appId: "1:44176577069:web:65173b0b8971940c279ea4",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ---------------------------------------------------------------------------
// Stations
// ---------------------------------------------------------------------------

const stationCoords = [
  { name: "Batajnica", lat: 44.899065, lng: 20.27191 },
  { name: "Kamendin", lat: 44.867079, lng: 20.320595 },
  { name: "Zemunsko polje", lat: 44.857626, lng: 20.334777 },
  { name: "Altina", lat: 44.850288, lng: 20.345783 },
  { name: "Zemun", lat: 44.837477, lng: 20.36857 },
  { name: "Tošin bunar", lat: 44.816467, lng: 20.397013 },
  { name: "Novi Beograd", lat: 44.807624, lng: 20.416245 },
  { name: "Beograd centar", lat: 44.793281, lng: 20.454279 },
  { name: "Karađorđev park", lat: 44.794314, lng: 20.466301 },
  { name: "Vukov spomenik", lat: 44.805425, lng: 20.478135 },
  { name: "Pančevački most", lat: 44.820141, lng: 20.490187 },
  { name: "Krnjača most", lat: 44.840917, lng: 20.498062 },
  { name: "Krnjača", lat: 44.848008, lng: 20.505423 },
  { name: "Sebeš", lat: 44.861054, lng: 20.519307 },
  { name: "Ovča", lat: 44.875324, lng: 20.543919 },
  { name: "Resnik", lat: 44.704381, lng: 20.44843 },
  { name: "Kijevo", lat: 44.723309, lng: 20.437099 },
  { name: "Kneževac", lat: 44.732013, lng: 20.430961 },
  { name: "Rakovica", lat: 44.747195, lng: 20.443405 },
  { name: "Bela reka", lat: 44.656103, lng: 20.472839 },
  { name: "Barajevo ukrsnica", lat: 44.59389, lng: 20.425254 },
  { name: "Barajevo centar", lat: 44.577283, lng: 20.412113 },
  { name: "Veliki Borak", lat: 44.540353, lng: 20.377918 },
  { name: "Leskovac kolubarski", lat: 44.508448, lng: 20.342241 },
  { name: "Stepojevac", lat: 44.496681, lng: 20.310019 },
  { name: "Vreoci", lat: 44.448985, lng: 20.279543 },
  { name: "Lazarevac", lat: 44.385115, lng: 20.245714 },
  { name: "Ripanj kolonija", lat: 44.668438, lng: 20.494896 },
  { name: "Ripanj", lat: 44.662314, lng: 20.506953 },
  { name: "Klenje", lat: 44.641734, lng: 20.532856 },
  { name: "Ralja", lat: 44.568284, lng: 20.56083 },
  { name: "Sopot kosmajski", lat: 44.52376, lng: 20.611664 },
  { name: "Vlaško polje", lat: 44.480561, lng: 20.660326 },
  { name: "Mladenovac", lat: 44.440224, lng: 20.691199 },
  { name: "Ripanj tunel", lat: 44.600346, lng: 20.532142 },
];

const cyrillicMap = {
  "Batajnica": "Батајница",
  "Kamendin": "Камендин стајалиште",
  "Zemunsko polje": "Земунско поље",
  "Altina": "Алтина стајалиште",
  "Zemun": "Земун",
  "Tošin bunar": "Тошин бунар стај.",
  "Novi Beograd": "Нови Београд",
  "Beograd centar": "Београд Центар",
  "Karađorđev park": "Карађорђев парк",
  "Vukov spomenik": "Вуков споменик",
  "Pančevački most": "Панчевачки мост",
  "Krnjača most": "Крњача мост",
  "Krnjača": "Крњача укр.",
  "Sebeš": "Себеш стај.",
  "Ovča": "Овча",
  "Resnik": "Ресник",
  "Kijevo": "Кијево стај.",
  "Kneževac": "Кнежевац",
  "Rakovica": "Раковица",
  "Bela reka": "Бела река",
  "Barajevo ukrsnica": "Барајево укрсница",
  "Barajevo centar": "Барајево Центар",
  "Veliki Borak": "Велики Борак",
  "Leskovac kolubarski": "Лесковац Колубарски",
  "Stepojevac": "Степојевац",
  "Vreoci": "Вреоци",
  "Lazarevac": "Лазаревац",
  "Ripanj kolonija": "Рипањ колонија",
  "Ripanj": "Рипањ",
  "Ripanj tunel": "Рипањ тунел",
  "Klenje": "Клење",
  "Ralja": "Раља",
  "Sopot kosmajski": "Сопот космајски",
  "Vlaško polje": "Влашко поље",
  "Mladenovac": "Младеновац",
};

// Which lines each station belongs to
const stationLines = {
  // BG1 / BG1R stations
  "Batajnica": ["BG1", "BG1R"],
  "Kamendin": ["BG1", "BG1R"],
  "Zemunsko polje": ["BG1", "BG1R"],
  "Altina": ["BG1", "BG1R"],
  "Zemun": ["BG1", "BG1R"],
  "Tošin bunar": ["BG1", "BG1R"],
  "Novi Beograd": ["BG1", "BG1R"],
  "Beograd centar": ["BG1", "BG1R", "BG2", "BG2R", "BG3", "BG3R"],
  "Karađorđev park": ["BG1", "BG1R", "BG2", "BG2R", "BG3", "BG3R"],
  "Vukov spomenik": ["BG1", "BG1R", "BG2", "BG2R", "BG3", "BG3R"],
  "Pančevački most": ["BG1", "BG1R", "BG2", "BG2R", "BG3", "BG3R"],
  "Krnjača most": ["BG1", "BG1R", "BG2", "BG2R", "BG3", "BG3R"],
  "Krnjača": ["BG1", "BG1R", "BG2", "BG2R", "BG3", "BG3R"],
  "Sebeš": ["BG1", "BG1R", "BG2", "BG2R", "BG3", "BG3R"],
  "Ovča": ["BG1", "BG1R", "BG2", "BG2R", "BG3", "BG3R"],
  // BG2 / BG2R only
  "Resnik": ["BG2", "BG2R", "BG3", "BG3R"],
  "Kijevo": ["BG2", "BG2R", "BG3", "BG3R"],
  "Kneževac": ["BG2", "BG2R", "BG3", "BG3R"],
  "Rakovica": ["BG2", "BG2R", "BG3", "BG3R"],
  // BG3 / BG3R only
  "Bela reka": ["BG3", "BG3R"],
  "Barajevo ukrsnica": ["BG3", "BG3R"],
  "Barajevo centar": ["BG3", "BG3R"],
  "Veliki Borak": ["BG3", "BG3R"],
  "Leskovac kolubarski": ["BG3", "BG3R"],
  "Stepojevac": ["BG3", "BG3R"],
  "Vreoci": ["BG3", "BG3R"],
  "Lazarevac": ["BG3", "BG3R"],
  // Stations not on any BG Voz line currently
  "Ripanj kolonija": [],
  "Ripanj": [],
  "Ripanj tunel": [],
  "Klenje": [],
  "Ralja": [],
  "Sopot kosmajski": [],
  "Vlaško polje": [],
  "Mladenovac": [],
};

// ---------------------------------------------------------------------------
// Lines
// ---------------------------------------------------------------------------

const BG1_STATIONS = [
  "Batajnica", "Kamendin", "Zemunsko polje", "Altina", "Zemun",
  "Tošin bunar", "Novi Beograd", "Beograd centar", "Karađorđev park",
  "Vukov spomenik", "Pančevački most", "Krnjača most", "Krnjača",
  "Sebeš", "Ovča",
];

const BG2_STATIONS = [
  "Resnik", "Kijevo", "Kneževac", "Rakovica", "Karađorđev park",
  "Vukov spomenik", "Pančevački most", "Krnjača most", "Krnjača",
  "Sebeš", "Ovča",
];

const BG3_STATIONS = [
  "Lazarevac", "Vreoci", "Stepojevac", "Leskovac kolubarski",
  "Veliki Borak", "Barajevo centar", "Barajevo ukrsnica", "Bela reka",
  "Resnik", "Kijevo", "Kneževac", "Rakovica", "Karađorđev park",
  "Vukov spomenik", "Pančevački most", "Krnjača most", "Krnjača",
  "Sebeš", "Ovča",
];

const lines = [
  { id: "BG1", name: "BG1 Batajnica - Ovča", direction: "forward", stations: BG1_STATIONS, color: "#C2185B" },
  { id: "BG1R", name: "BG1 Ovča - Batajnica", direction: "reverse", stations: [...BG1_STATIONS].reverse(), color: "#C2185B" },
  { id: "BG2", name: "BG2 Resnik - Ovča", direction: "forward", stations: BG2_STATIONS, color: "#097138" },
  { id: "BG2R", name: "BG2 Ovča - Resnik", direction: "reverse", stations: [...BG2_STATIONS].reverse(), color: "#097138" },
  { id: "BG3", name: "BG3 Lazarevac - Ovča", direction: "forward", stations: BG3_STATIONS, color: "#1A237E",
    notes: "Some trains also run via Beograd centar / Novi Beograd / Zemun" },
  { id: "BG3R", name: "BG3 Ovča - Lazarevac", direction: "reverse", stations: [...BG3_STATIONS].reverse(), color: "#1A237E",
    notes: "Some trains also run via Zemun / Novi Beograd / Beograd centar" },
];

// ---------------------------------------------------------------------------
// Schedules — BG1 forward (Batajnica → Ovča)
// ---------------------------------------------------------------------------

// Station order for BG1 forward schedule (departure times only, no duplicate Beograd centar)
const BG1_SCHEDULE_STATIONS = [
  "Batajnica", "Kamendin", "Zemunsko polje", "Altina", "Zemun",
  "Tošin bunar", "Novi Beograd", "Beograd centar", "Karađorđev park",
  "Vukov spomenik", "Pančevački most", "Krnjača most", "Krnjača",
  "Sebeš", "Ovča",
];

// Each inner array is one column (one train), row order matches BG1_SCHEDULE_STATIONS
// For Beograd centar we use the DEPARTURE time (the second row in the original timetable)
const BG1_FWD_TIMES = [
  ["6.00","6.04","6.06","6.08","6.12","6.16","6.19","6.23","6.27","6.31","6.35","6.39","6.42","6.45","6.48"],
  ["6.30","6.34","6.36","6.38","6.42","6.46","6.49","6.53","6.57","7.01","7.05","7.09","7.12","7.15","7.18"],
  ["7.10","7.14","7.16","7.18","7.22","7.26","7.29","7.33","7.37","7.41","7.45","7.49","7.52","7.55","7.58"],
  ["7.30","7.34","7.36","7.38","7.42","7.46","7.49","7.53","7.57","8.01","8.05","8.09","8.12","8.15","8.18"],
  ["8.00","8.04","8.06","8.08","8.12","8.16","8.19","8.23","8.27","8.31","8.35","8.39","8.42","8.45","8.48"],
  ["8.30","8.34","8.36","8.38","8.42","8.46","8.49","8.53","8.57","9.01","9.05","9.09","9.12","9.15","9.18"],
  ["8.57","9.01","9.03","9.05","9.18","9.22","9.25","9.29","9.33","9.37","9.41","9.45","9.48","9.51","9.54"],
  ["9.30","9.34","9.36","9.38","9.42","9.46","9.49","9.53","9.57","10.01","10.05","10.09","10.12","10.15","10.18"],
  ["10.10","10.14","10.16","10.18","10.22","10.26","10.29","10.33","10.37","10.41","10.45","10.49","10.52","10.55","10.58"],
  ["11.20","11.24","11.26","11.28","11.32","11.36","11.39","11.43","11.47","11.51","11.55","11.59","12.02","12.05","12.08"],
  ["12.00","12.04","12.06","12.08","12.12","12.16","12.19","12.23","12.27","12.31","12.35","12.39","12.42","12.45","12.48"],
  ["13.20","13.24","13.26","13.28","13.32","13.36","13.39","13.43","13.47","13.51","13.55","13.59","14.02","14.05","14.08"],
  ["14.00","14.04","14.06","14.08","14.12","14.16","14.19","14.23","14.27","14.31","14.35","14.39","14.42","14.45","14.48"],
  ["14.30","14.34","14.36","14.38","14.42","14.46","14.49","14.53","14.57","15.01","15.05","15.09","15.12","15.15","15.18"],
  ["15.10","15.14","15.16","15.18","15.22","15.26","15.29","15.33","15.37","15.41","15.45","15.49","15.52","15.55","15.58"],
  ["15.30","15.34","15.36","15.38","15.42","15.46","15.49","15.53","15.57","16.01","16.05","16.09","16.12","16.15","16.18"],
  ["16.00","16.04","16.06","16.08","16.12","16.16","16.19","16.23","16.27","16.31","16.35","16.39","16.42","16.45","16.48"],
  ["16.30","16.34","16.36","16.38","16.42","16.46","16.49","16.53","16.57","17.01","17.05","17.09","17.12","17.15","17.18"],
  ["17.10","17.14","17.16","17.18","17.22","17.26","17.29","17.33","17.37","17.41","17.45","17.49","17.52","17.55","17.58"],
  ["17.30","17.34","17.36","17.38","17.42","17.46","17.49","17.53","17.57","18.01","18.05","18.09","18.12","18.15","18.18"],
  ["18.30","18.34","18.36","18.38","18.42","18.46","18.49","18.53","18.57","19.01","19.05","19.09","19.12","19.15","19.18"],
  ["19.10","19.14","19.16","19.18","19.22","19.26","19.29","19.33","19.37","19.41","19.45","19.49","19.52","19.55","19.58"],
  ["20.00","20.04","20.06","20.08","20.12","20.16","20.19","20.23","20.27","20.31","20.35","20.39","20.42","20.45","20.48"],
];

// Train numbers for BG1 forward — odd numbers starting at 8001
const BG1_FWD_TRAIN_NUMBERS = [
  "8001","8003","8005","8007","8009","8011","8013","8015","8017","8019",
  "8021","8023","8025","8027","8029","8031","8033","8035","8037","8039",
  "8041","8043","8045",
];

// ---------------------------------------------------------------------------
// Schedules — BG1R reverse (Ovča → Batajnica)
// ---------------------------------------------------------------------------

const BG1R_SCHEDULE_STATIONS = [
  "Ovča", "Sebeš", "Krnjača", "Krnjača most", "Pančevački most",
  "Vukov spomenik", "Karađorđev park", "Beograd centar", "Novi Beograd",
  "Tošin bunar", "Zemun", "Altina", "Zemunsko polje", "Kamendin", "Batajnica",
];

// Each inner array = one train (column), row order matches BG1R_SCHEDULE_STATIONS
// "-" means the train skips that station
const BG1R_TIMES = [
  ["5.40","5.44","5.48","5.50","5.56","5.59","6.03","6.06","6.10","6.13","6.17","6.20","6.22","6.24","6.28"],
  ["6.10","6.14","6.18","6.20","6.26","6.29","6.33","6.36","6.40","6.43","6.47","6.50","6.52","6.54","6.58"],
  ["6.40","6.44","6.48","6.50","6.56","6.59","7.03","7.06","7.10","7.13","7.17","7.20","7.22","7.24","7.28"],
  ["7.10","7.14","7.18","7.20","7.26","7.29","7.33","7.36","7.40","7.43","7.47","7.50","7.52","7.54","7.58"],
  ["7.40","7.44","7.48","7.50","7.56","7.59","8.03","8.06","8.10","8.13","8.17","8.20","8.22","8.24","8.28"],
  ["8.10","8.14","8.18","8.20","8.26","8.29","8.33","8.36","8.40","8.43","8.47","8.50","8.52","8.54","8.58"],
  ["8.40","8.44","8.48","8.50","8.56","8.59","9.03","9.06","9.10","9.13","9.17","9.20","9.22","9.24","9.28"],
  ["9.10","9.14","9.18","9.20","9.26","9.29","9.33","9.36","9.40","9.43","9.47","9.50","9.52","9.54","9.58"],
  ["9.50","9.54","9.58","10.00","10.06","10.09","10.13","10.16","10.20","10.23","10.27","10.30","10.32","10.34","10.38"],
  ["10.50","10.54","10.58","11.00","11.06","11.09","11.13","11.16","11.20","11.23","11.27","11.30","11.32","11.34","11.38"],
  ["11.20","11.24","11.28","11.30","11.36","11.39","11.43","11.46","11.50","11.53","11.56","-","-","-","-"],
  ["12.10","12.14","12.18","12.20","12.26","12.29","12.33","12.36","12.40","12.43","12.47","12.50","12.52","12.54","12.58"],
  ["13.10","13.14","13.18","13.20","13.26","13.29","13.33","13.36","13.40","13.43","13.47","13.50","13.52","13.54","13.58"],
  ["13.50","13.54","13.58","14.00","14.06","14.09","14.13","14.16","14.20","14.23","14.27","14.30","14.32","14.34","14.38"],
  ["14.40","14.44","14.48","14.50","14.56","14.59","15.03","15.06","15.10","15.13","15.17","15.20","15.22","15.24","15.28"],
  ["15.10","15.14","15.18","15.20","15.26","15.29","15.33","15.36","15.40","15.43","15.47","15.50","15.52","15.54","15.58"],
  ["15.40","15.44","15.48","15.50","15.56","15.59","16.03","16.06","16.10","16.13","16.17","16.20","16.22","16.24","16.28"],
  ["16.20","16.24","16.28","16.30","16.36","16.39","16.43","16.46","16.50","16.53","16.57","17.00","17.02","17.04","17.08"],
  ["16.40","16.44","16.48","16.50","16.56","16.59","17.03","17.06","17.10","17.13","17.17","17.20","17.22","17.24","17.28"],
  ["17.10","17.14","17.18","17.20","17.26","17.29","17.33","17.36","17.40","17.43","17.47","17.50","17.52","17.54","17.58"],
  ["17.50","17.54","17.58","18.00","18.06","18.09","18.13","18.16","18.20","18.23","18.27","18.30","18.32","18.34","18.38"],
  ["18.40","18.44","18.48","18.50","18.56","18.59","19.03","19.06","19.10","19.13","19.16","-","-","-","-"],
  ["19.10","19.14","19.18","19.20","19.26","19.29","19.33","19.36","19.40","19.43","19.47","19.50","19.52","19.54","19.58"],
  ["19.40","19.44","19.48","19.50","19.56","19.59","20.03","20.06","20.10","20.13","20.17","20.20","20.22","20.24","20.28"],
  ["20.20","20.24","20.28","20.30","20.36","20.39","20.43","20.46","20.50","20.53","20.57","21.00","21.02","21.04","21.08"],
  ["21.10","21.14","21.18","21.20","21.26","21.29","21.33","21.36","21.40","21.43","21.47","21.50","21.52","21.54","21.58"],
  ["22.35","22.39","22.43","22.45","22.51","22.54","22.58","23.01","23.05","23.08","23.11","-","-","-","-"],
];

const BG1R_TRAIN_NUMBERS = [
  "8000","8002","8004","8006","8008","8010","8012","8014","8016","8018",
  "8020","8022","8024","8026","8028","8030","8032","8034","8036","8038",
  "8040","8042","8044","8046","8048","8050","8340",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert "6.00" or "10.05" to "6:00" or "10:05" */
function fmtTime(t) {
  return t.replace(".", ":");
}

/** Build stops array from times, skipping "-" entries */
function buildStops(stations, times) {
  const stops = [];
  for (let i = 0; i < stations.length; i++) {
    if (times[i] !== "-") {
      stops.push({ station: stations[i], time: fmtTime(times[i]) });
    }
  }
  return stops;
}

// ---------------------------------------------------------------------------
// Seed functions
// ---------------------------------------------------------------------------

async function seedStations() {
  console.log("--- Seeding bgvoz_stations ---");
  for (const s of stationCoords) {
    const docId = s.name;
    const data = {
      name: s.name,
      nameCyrillic: cyrillicMap[s.name] || s.name,
      lat: s.lat,
      lng: s.lng,
      lines: stationLines[s.name] || [],
    };
    await setDoc(doc(db, "bgvoz_stations", docId), data, { merge: true });
    console.log(`  Station: ${s.name}`);
  }
  console.log(`  Done — ${stationCoords.length} stations seeded.\n`);
}

async function seedLines() {
  console.log("--- Seeding bgvoz_lines ---");
  for (const l of lines) {
    const { id, ...data } = l;
    await setDoc(doc(db, "bgvoz_lines", id), data, { merge: true });
    console.log(`  Line: ${id} — ${data.name}`);
  }
  console.log(`  Done — ${lines.length} lines seeded.\n`);
}

async function seedSchedules() {
  console.log("--- Seeding bgvoz_schedules ---");

  const validFrom = "2026-02-18";
  const validTo = "2026-12-12";
  let count = 0;

  // BG1 forward
  for (let i = 0; i < BG1_FWD_TRAIN_NUMBERS.length; i++) {
    const trainNumber = BG1_FWD_TRAIN_NUMBERS[i];
    const times = BG1_FWD_TIMES[i];
    const stops = buildStops(BG1_SCHEDULE_STATIONS, times);
    const data = {
      trainNumber,
      lineId: "BG1",
      direction: "forward",
      stops,
      notes: "",
      validFrom,
      validTo,
    };
    await setDoc(doc(db, "bgvoz_schedules", trainNumber), data, { merge: true });
    console.log(`  Train ${trainNumber} (BG1 fwd) — departs ${stops[0].time}`);
    count++;
  }

  // BG1R reverse
  for (let i = 0; i < BG1R_TRAIN_NUMBERS.length; i++) {
    const trainNumber = BG1R_TRAIN_NUMBERS[i];
    const times = BG1R_TIMES[i];
    const stops = buildStops(BG1R_SCHEDULE_STATIONS, times);
    const data = {
      trainNumber,
      lineId: "BG1R",
      direction: "reverse",
      stops,
      notes: "",
      validFrom,
      validTo,
    };
    await setDoc(doc(db, "bgvoz_schedules", trainNumber), data, { merge: true });
    console.log(`  Train ${trainNumber} (BG1R rev) — departs ${stops[0].time}`);
    count++;
  }

  console.log(`  Done — ${count} schedules seeded.\n`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("Starting BG Voz seed...\n");
  await seedStations();
  await seedLines();
  await seedSchedules();
  console.log("All done! Seeding complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
