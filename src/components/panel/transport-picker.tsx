"use client";

import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BusIllustration,
  CarIllustration,
  NavigateIllustration,
} from "@/components/icons";

export type TransportMode = "public" | "carshare" | "navigate";

interface TransportPickerProps {
  destination: string;
  onSelect: (mode: TransportMode) => void;
  onBack: () => void;
}

const TRANSPORT_OPTIONS: {
  id: TransportMode;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    id: "public",
    label: "Javni prevoz",
    description: "Voz, autobus, tramvaj",
    icon: BusIllustration,
  },
  {
    id: "carshare",
    label: "Car sharing",
    description: "Podeli vožnju sa drugima",
    icon: CarIllustration,
  },
  {
    id: "navigate",
    label: "Navigacija i parking",
    description: "Pronađi rutu i parking",
    icon: NavigateIllustration,
  },
];

export function TransportPicker({
  destination,
  onSelect,
  onBack,
}: TransportPickerProps) {
  return (
    <div className="space-y-5">
      {/* Header with back */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="h-9 w-9 rounded-full"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0">
          <p className="text-xs text-gray-400">Odredište</p>
          <p className="truncate text-sm font-semibold text-gray-900">
            {destination}
          </p>
        </div>
      </div>

      {/* Transport mode heading */}
      <h2 className="text-xl font-semibold text-gray-900">
        Kako želite da stignete?
      </h2>

      {/* Transport cards */}
      <div className="space-y-3">
        {TRANSPORT_OPTIONS.map((option) => {
          const Icon = option.icon;
          return (
            <button
              key={option.id}
              onClick={() => onSelect(option.id)}
              className="flex w-full items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-sm transition-all hover:border-[#F08D39] hover:shadow-md active:scale-[0.98]"
            >
              <div className="flex h-16 w-16 shrink-0 items-center justify-center">
                <Icon className="h-16 w-16" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-gray-900">
                  {option.label}
                </p>
                <p className="text-sm text-gray-400">{option.description}</p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F08D39]/10">
                <ArrowLeft className="h-4 w-4 rotate-180 text-[#F08D39]" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
