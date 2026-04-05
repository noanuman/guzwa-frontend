"use client";

import { MapPin, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface DestinationInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export function DestinationInput({
  value,
  onChange,
  onSubmit,
}: DestinationInputProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">Gde idete?</h2>

      {/* Current location (read-only) */}
      <div className="flex items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F08D39]">
          <MapPin className="h-4 w-4 text-white" />
        </div>
        <span className="text-sm text-gray-500">Vaša trenutna lokacija</span>
      </div>

      {/* Destination input */}
      <div className="flex items-center gap-3 rounded-2xl bg-gray-50 px-4 py-1">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200">
          <Search className="h-4 w-4 text-gray-500" />
        </div>
        <Input
          placeholder="Unesite adresu odredišta..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && value.trim()) onSubmit();
          }}
          className="border-0 bg-transparent text-sm shadow-none focus-visible:ring-0"
        />
      </div>

      {/* Quick suggestions */}
      <div className="space-y-1 pt-2">
        <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
          Nedavno
        </p>
        {RECENT_PLACES.map((place) => (
          <button
            key={place.name}
            onClick={() => {
              onChange(place.address);
              onSubmit();
            }}
            className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-gray-50"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100">
              <MapPin className="h-4 w-4 text-gray-400" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900">
                {place.name}
              </p>
              <p className="truncate text-xs text-gray-400">{place.address}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

const RECENT_PLACES = [
  { name: "Kalemegdan", address: "Beograd, Stari Grad" },
  { name: "Ada Ciganlija", address: "Čukarica, Beograd" },
  { name: "Hala Pionir", address: "Čika Ljubina 2, Beograd" },
];
