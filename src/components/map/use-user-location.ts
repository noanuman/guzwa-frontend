"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export function useUserLocation() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const locationRef = useRef<{ lat: number; lng: number } | null>(null);

  // Keep ref in sync for use in callbacks
  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  const request = useCallback(() => {
    if (locationRef.current) return Promise.resolve(locationRef.current);

    setLoading(true);
    setError(null);

    return new Promise<{ lat: number; lng: number }>((resolve, reject) => {
      if (!navigator.geolocation) {
        setError("Geolokacija nije podržana");
        setLoading(false);
        reject(new Error("not supported"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLocation(loc);
          if (pos.coords.heading != null) setHeading(pos.coords.heading);
          setLoading(false);
          resolve(loc);
        },
        (err) => {
          setError(err.message);
          setLoading(false);
          reject(err);
        },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 30000 }
      );
    });
  }, []);

  const startWatching = useCallback(() => {
    if (watchIdRef.current != null) return;
    if (!navigator.geolocation) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        if (pos.coords.heading != null) setHeading(pos.coords.heading);
      },
      (err) => {
        setError(err.message);
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );
  }, []);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  return { location, heading, error, loading, request, startWatching, stopWatching };
}
