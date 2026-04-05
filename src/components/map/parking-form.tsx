"use client";

import { useState, useRef } from "react";
import { X, Loader2, MapPin, ParkingCircle, Clock, Phone, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth-context";
import { createParkingSpot } from "@/lib/parking-store";

interface ParkingFormProps {
  lat: number;
  lng: number;
  onClose: () => void;
  onSubmitted: () => void;
}

export function ParkingForm({ lat, lng, onClose, onSubmitted }: ParkingFormProps) {
  const { user, signInWithGoogle } = useAuth();
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [availableFrom, setAvailableFrom] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  });
  const [availableUntil, setAvailableUntil] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 2);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  });
  const [loading, setLoading] = useState(false);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!user || !description.trim() || !availableUntil) return;
    setLoading(true);
    try {
      const spotId = await createParkingSpot(user.uid, {
        ownerName: user.displayName ?? "Anonimno",
        description: description.trim(),
        phone: phone.trim(),
        photo: "",
        availableFrom,
        availableUntil,
        lat,
        lng,
      });

      // Upload image using the spot ID as filename
      if (photoFile) {
        const fd = new FormData();
        fd.append("file", photoFile);
        fd.append("id", spotId);
        fd.append("type", "parking");
        await fetch("/api/upload-image", { method: "POST", body: fd });
      }

      onSubmitted();
    } catch (err) {
      console.error("Failed to create parking spot:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="fixed inset-0 z-[1200] flex items-end justify-center pb-4 md:items-start md:justify-end md:p-4">
        <Card className="w-[360px] shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
          <CardContent className="space-y-3 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ParkingCircle className="h-4 w-4 text-blue-500" />
                <p className="text-sm font-semibold">Podeli parking</p>
              </div>
              <Button variant="ghost" size="icon-xs" onClick={onClose}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Prijavi se da bi podelio parking mesto
            </p>
            <Button className="w-full" size="sm" onClick={signInWithGoogle}>
              Prijavi se sa Google
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[1200] flex items-end justify-center pb-4 md:items-start md:justify-end md:p-4">
      <Card className="w-[360px] shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
        <CardContent className="space-y-3 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ParkingCircle className="h-4 w-4 text-blue-500" />
              <p className="text-sm font-semibold">Podeli parking mesto</p>
            </div>
            <Button variant="ghost" size="icon-xs" onClick={onClose}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>{lat.toFixed(5)}, {lng.toFixed(5)}</span>
          </div>

          <Separator />

          {/* Photo */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Fotografija</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhotoChange}
            />
            {photoPreview ? (
              <div className="relative">
                <img src={photoPreview} alt="Parking" className="h-32 w-full rounded-lg object-cover" />
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="absolute right-1 top-1 bg-black/50 text-white hover:bg-black/70"
                  onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1.5"
                onClick={() => fileRef.current?.click()}
              >
                <Camera className="h-3.5 w-3.5" />
                Uslikaj ili izaberi sliku
              </Button>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Opis mesta</label>
            <Input
              placeholder="npr. Garaža, dvorište, ulično mesto..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-8 text-sm"
              maxLength={200}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Broj telefona (opciono)</label>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <Input
                type="tel"
                placeholder="npr. 065 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-8 text-sm"
                maxLength={20}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Slobodno od</label>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Input
                type="time"
                value={availableFrom}
                onChange={(e) => setAvailableFrom(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Slobodno do</label>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Input
                type="time"
                value={availableUntil}
                onChange={(e) => setAvailableUntil(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>

          <Separator />

          {availableUntil <= availableFrom && (
            <p className="text-xs text-red-500 text-center">Vreme &quot;do&quot; mora biti posle vremena &quot;od&quot;</p>
          )}

          <p className="text-[10px] text-muted-foreground text-center">
            Mesto nestaje sa mape kad istekne vreme. Dobijaš 3 boda kad neko rezerviše.
          </p>

          <Button
            size="sm"
            className="w-full"
            disabled={loading || !description.trim() || !availableUntil || availableUntil <= availableFrom}
            onClick={handleSubmit}
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Objavi parking mesto"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
