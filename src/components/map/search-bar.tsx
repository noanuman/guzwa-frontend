"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronRight, MapPin, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { FilterPopover } from "./filter-popover";
import { ProfilePopover } from "./profile-popover";
import { Command, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import type { PlacePrediction, SelectedPlace } from "./types";

export function SearchWithAutocomplete({ onPlaceSelect, userPos, placeholder }: { onPlaceSelect: (place: SelectedPlace) => void; userPos: { lat: number; lng: number } | null; placeholder?: string }) {
  const map = useMap();
  const places = useMapsLibrary("places");
  const geometryLib = useMapsLibrary("geometry");
  const [search, setSearch] = useState("");
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchPredictions = useCallback(
    (input: string) => {
      if (!places || !input.trim()) {
        setPredictions([]);
        return;
      }

      if (!sessionTokenRef.current) {
        sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
      }

      const service = new google.maps.places.AutocompleteService();
      service.getPlacePredictions(
        {
          input,
          sessionToken: sessionTokenRef.current,
          componentRestrictions: { country: "rs" },
        },
        (results) => {
          if (!results) {
            setPredictions([]);
            return;
          }

          const preds = results.map((r) => ({
            placeId: r.place_id,
            mainText: r.structured_formatting.main_text,
            secondaryText: r.structured_formatting.secondary_text,
            distanceKm: null as string | null,
          }));
          setPredictions(preds);

          // Compute distances if we have user location and geometry lib
          if (!userPos || !geometryLib) return;
          const geocoder = new google.maps.Geocoder();
          const userLatLng = new google.maps.LatLng(userPos.lat, userPos.lng);

          preds.forEach((pred, i) => {
            geocoder.geocode({ placeId: pred.placeId }, (geoResults, geoStatus) => {
              if (geoStatus === "OK" && geoResults?.[0]?.geometry?.location) {
                const dist = google.maps.geometry.spherical.computeDistanceBetween(
                  userLatLng,
                  geoResults[0].geometry.location
                );
                const km = dist < 1000
                  ? `${Math.round(dist)} m`
                  : `${(dist / 1000).toFixed(1)} km`;
                setPredictions((prev) =>
                  prev.map((p, j) => (j === i ? { ...p, distanceKm: km } : p))
                );
              }
            });
          });
        }
      );
    },
    [places, userPos, geometryLib]
  );

  const handleInputChange = (value: string) => {
    setSearch(value);
    setShowResults(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPredictions(value), 300);
  };

  const handleSelect = (prediction: PlacePrediction) => {
    setSearch(prediction.mainText);
    setShowResults(false);
    setPredictions([]);
    sessionTokenRef.current = null;

    onPlaceSelect({
      placeId: prediction.placeId,
      name: prediction.mainText,
      address: prediction.secondaryText,
    });

    if (!map) return;
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ placeId: prediction.placeId }, (results, status) => {
      if (status === "OK" && results?.[0]?.geometry?.location) {
        map.panTo(results[0].geometry.location);
        map.setZoom(16);
      }
    });
  };

  return (
    <div ref={containerRef} className="relative w-[280px] sm:w-[320px]">
      <div className="relative">
        <Input
          placeholder={placeholder ?? "Gde idete?"}
          value={search}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => predictions.length > 0 && setShowResults(true)}
          className="h-9 w-full rounded-lg border-border bg-background/95 pr-8 shadow-sm backdrop-blur-sm transition-shadow focus:shadow-md"
        />
        {search && (
          <button
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
            onClick={() => { setSearch(""); setPredictions([]); setShowResults(false); }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {showResults && predictions.length > 0 && (
        <div className="absolute left-0 top-[44px] w-full animate-in fade-in slide-in-from-top-1 duration-200">
          <Command className="rounded-xl border border-border bg-background shadow-xl" shouldFilter={false}>
            <CommandList className="max-h-64">
              <CommandEmpty>Nema rezultata</CommandEmpty>
              <CommandGroup>
                {predictions.map((p) => (
                  <CommandItem
                    key={p.placeId}
                    value={p.placeId}
                    onSelect={() => handleSelect(p)}
                    className="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{p.mainText}</p>
                      <p className="truncate text-xs text-muted-foreground">{p.secondaryText}</p>
                    </div>
                    {p.distanceKm && (
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{p.distanceKm}</span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
}

// Legacy SearchBar used by map-view.tsx
interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  activeFilters: Set<string>;
  onFilterToggle: (id: string) => void;
}

export function SearchBar({
  value,
  onChange,
  activeFilters,
  onFilterToggle,
}: SearchBarProps) {
  return (
    <div className="fixed top-3 left-1/2 z-[1000] flex -translate-x-1/2 items-center gap-3 w-[31.6%]">
      <ProfilePopover />

      <div className="flex h-14 flex-1 items-center rounded-xl bg-white px-4 shadow-lg">
        <input
          type="text"
          placeholder="Gde idete?"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none"
        />
        <ChevronRight className="h-5 w-5 shrink-0 text-gray-300" />
      </div>

      <FilterPopover
        activeFilters={activeFilters}
        onToggle={onFilterToggle}
      />
    </div>
  );
}
