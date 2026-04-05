"use client";

import { useEffect } from "react";
import { useMap } from "@vis.gl/react-google-maps";

export function MapStyler() {
  const map = useMap();

  const baseStyles: google.maps.MapTypeStyle[] = [
    // Base — keep some saturation, lighten slightly
    { featureType: "all", elementType: "geometry", stylers: [{ saturation: -40 }, { lightness: 10 }] },
    { featureType: "all", elementType: "labels.text.fill", stylers: [{ color: "#8a7e74" }] },
    { featureType: "all", elementType: "labels.text.stroke", stylers: [{ visibility: "off" }] },
    { featureType: "all", elementType: "labels.icon", stylers: [{ visibility: "off" }] },

    // Water — rich soft blue
    { featureType: "water", elementType: "geometry.fill", stylers: [{ color: "#b8d4e8" }] },
    { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#7ca8c4" }] },

    // Landscape — warm cream
    { featureType: "landscape", elementType: "geometry.fill", stylers: [{ color: "#f5f0ea" }] },
    { featureType: "landscape.man_made", elementType: "geometry.fill", stylers: [{ color: "#efe8e0" }] },
    { featureType: "landscape.natural", elementType: "geometry.fill", stylers: [{ color: "#f0eade" }] },

    // Parks — visible green
    { featureType: "poi.park", elementType: "geometry.fill", stylers: [{ color: "#c8dcc0" }] },
    { featureType: "poi.park", elementType: "labels", stylers: [{ visibility: "off" }] },

    // Roads — warm whites with subtle orange tint on highways
    { featureType: "road.highway", elementType: "geometry.fill", stylers: [{ color: "#fce8d0" }] },
    { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#e8c8a0" }, { weight: 0.8 }] },
    { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#a08868" }] },
    { featureType: "road.arterial", elementType: "geometry.fill", stylers: [{ color: "#ffffff" }] },
    { featureType: "road.arterial", elementType: "geometry.stroke", stylers: [{ color: "#e8e0d8" }, { weight: 0.3 }] },
    { featureType: "road.arterial", elementType: "labels.text.fill", stylers: [{ color: "#a89888" }] },
    { featureType: "road.local", elementType: "geometry.fill", stylers: [{ color: "#ffffff" }] },
    { featureType: "road.local", elementType: "geometry.stroke", stylers: [{ visibility: "off" }] },
    { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#bab0a4" }] },

    // Labels — only small ones
    { featureType: "administrative.neighborhood", elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "administrative.locality", elementType: "labels", stylers: [{ visibility: "off" }] },

    // Hide clutter
    { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "poi.business", stylers: [{ visibility: "off" }] },
    { featureType: "poi.medical", stylers: [{ visibility: "off" }] },
    { featureType: "poi.school", stylers: [{ visibility: "off" }] },
    { featureType: "transit", stylers: [{ visibility: "off" }] },
    { featureType: "administrative", elementType: "geometry", stylers: [{ visibility: "off" }] },
    { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
    { featureType: "administrative.country", elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "administrative.province", elementType: "labels", stylers: [{ visibility: "off" }] },
  ];

  const zoomedStyles: google.maps.MapTypeStyle[] = [
    ...baseStyles.filter((s) => s.featureType !== "transit"),
    { featureType: "transit.station", stylers: [{ visibility: "on" }] },
    { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#b0a090" }] },
    { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "on" }] },
  ];

  useEffect(() => {
    if (!map) return;
    map.setOptions({ clickableIcons: false, styles: baseStyles });

    const listener = map.addListener("zoom_changed", () => {
      const zoom = map.getZoom() ?? 13;
      map.setOptions({ styles: zoom >= 16 ? zoomedStyles : baseStyles });
    });

    return () => google.maps.event.removeListener(listener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);
  return null;
}
