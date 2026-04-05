"use client";

import { useState, useEffect } from "react";
import { APIProvider, Map as GoogleMap, useMap } from "@vis.gl/react-google-maps";
import { SAMPLE_PINS } from "./map-pins";
import { MapMarker } from "./map-marker";
import { OverlayMarker } from "./overlay-marker";
import { PinPopup } from "./pin-popup";
import { SearchBar } from "./search-bar";
import type { MapPin } from "./map-pins";

const BELGRADE_CENTER = { lat: 44.8076, lng: 20.4633 };

function MapStyler() {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    map.setOptions({ styles: MAP_STYLES });
  }, [map]);
  return null;
}

export function MapView() {
  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);
  const [popupOpen, setPopupOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());

  const handlePinClick = (pin: MapPin) => {
    setSelectedPin(pin);
    setPopupOpen(true);
  };

  const handleFilterToggle = (id: string) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

  return (
    <>
      {/* Search bar — fixed to viewport top, rendered BEFORE the map */}
      <SearchBar
        value={search}
        onChange={setSearch}
        activeFilters={activeFilters}
        onFilterToggle={handleFilterToggle}
      />

      <APIProvider apiKey={apiKey}>
        <GoogleMap
          defaultCenter={BELGRADE_CENTER}
          defaultZoom={13}
          gestureHandling="greedy"
          disableDefaultUI
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
        >
          <MapStyler />
          {SAMPLE_PINS.map((pin) => (
            <OverlayMarker
              key={pin.id}
              position={{ lat: pin.lat, lng: pin.lng }}
              onClick={() => handlePinClick(pin)}
            >
              <MapMarker type={pin.type} />
            </OverlayMarker>
          ))}
        </GoogleMap>
      </APIProvider>

      <PinPopup
        pin={selectedPin}
        open={popupOpen}
        onOpenChange={setPopupOpen}
      />
    </>
  );
}

// GUZWA-themed map styles
const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: "all", elementType: "geometry", stylers: [{ saturation: -90 }, { lightness: 10 }] },
  { featureType: "all", elementType: "labels.text.fill", stylers: [{ color: "#5E7AC4" }] },
  { featureType: "all", elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }, { weight: 2 }] },
  { featureType: "water", elementType: "geometry.fill", stylers: [{ color: "#c8d6f0" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3852B4" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#f0ece4" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#e8dfd2" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#7a7a8a" }] },
  { featureType: "landscape", elementType: "geometry.fill", stylers: [{ color: "#f5f3ef" }] },
  { featureType: "poi.park", elementType: "geometry.fill", stylers: [{ color: "#dce8d8" }] },
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "poi", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "transit", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "transit", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "poi.business", stylers: [{ visibility: "off" }] },
  { featureType: "poi.government", stylers: [{ visibility: "off" }] },
  { featureType: "poi.medical", stylers: [{ visibility: "off" }] },
  { featureType: "poi.place_of_worship", stylers: [{ visibility: "off" }] },
  { featureType: "poi.sports_complex", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#3852B4" }] },
];
