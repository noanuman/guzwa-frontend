"use client";

import { useState } from "react";
import { MapPin, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { TransportCard } from "./transport-card";
import {
  NavigateIllustration,
  BusIllustration,
  CarIllustration,
} from "@/components/icons";

export type TransportMode = "navigate" | "public" | "carshare";

interface HomePanelProps {
  onTransportSelect: (mode: TransportMode, destination: string) => void;
}

const RECENT_PLACES = [
  {
    name: "Elektrotehnički fakultet",
    address: "Bulevar kralja Aleksandra 73",
    time: "14 min",
  },
  {
    name: "Arsenija Čarnojevića 58",
    address: "Beograd",
    time: "18 min",
  },
  {
    name: "Studentski trg",
    address: "Studentski trg 1, Beograd",
    time: "9 min",
  },
  {
    name: "Ada Ciganlija",
    address: "Čukarica, Beograd",
    time: "22 min",
  },
  {
    name: "Ušće Shopping Center",
    address: "Bulevar Mihajla Pupina 4",
    time: "16 min",
  },
];

export function HomePanel({ onTransportSelect }: HomePanelProps) {
  const [destination, setDestination] = useState("");

  const handleSelect = (mode: TransportMode) => {
    onTransportSelect(mode, destination);
  };

  return (
    <div className="space-y-4">
      {/* Transport grid: nav + public stacked left, carshare tall right */}
      <div className="mx-auto grid w-full max-w-[557px] grid-cols-[1fr_1fr] grid-rows-[140px_140px] gap-5">
        <TransportCard
          label="Navigacija"
          subtitle="Pronađi parking"
          icon={NavigateIllustration}
          onClick={() => handleSelect("navigate")}
        />
        <TransportCard
          label="Car sharing"
          icon={CarIllustration}
          onClick={() => handleSelect("carshare")}
          tall
        />
        <TransportCard
          label="Javni prevoz"
          icon={BusIllustration}
          onClick={() => handleSelect("public")}
        />
      </div>

      {/* Where to? bar */}
      <div className="flex items-center gap-3 rounded-full bg-gray-100 px-4 py-3">
        <Input
          placeholder="Gde idete?"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && destination.trim())
              handleSelect("navigate");
          }}
          className="h-auto border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
        />
        <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
      </div>

      {/* Recent places — scrollable */}
      <div className="max-h-36 space-y-0.5 overflow-y-auto pr-1">
        {RECENT_PLACES.map((place) => (
          <button
            key={place.name}
            onClick={() => {
              setDestination(place.address);
              handleSelect("navigate");
            }}
            className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-gray-50"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100">
              <MapPin className="h-3.5 w-3.5 text-gray-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">
                {place.name}
              </p>
              <p className="truncate text-xs text-gray-400">{place.address}</p>
            </div>
            <span className="shrink-0 text-xs text-gray-400">
              {place.time}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
