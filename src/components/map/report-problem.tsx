"use client";

import { useState, useRef } from "react";
import { X, Camera, Loader2, MapPin, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth-context";
import { reportProblem, uploadProblemPhoto } from "@/lib/problems-store";

interface ReportProblemFormProps {
  lat: number;
  lng: number;
  onClose: () => void;
  onSubmitted: () => void;
}

export function ReportProblemForm({
  lat,
  lng,
  onClose,
  onSubmitted,
}: ReportProblemFormProps) {
  const { user, signInWithGoogle } = useAuth();
  const [description, setDescription] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!user || !description.trim()) return;
    setLoading(true);
    try {
      let photoUrl = "";
      if (photoFile) {
        photoUrl = await uploadProblemPhoto(photoFile);
      }
      await reportProblem(user.uid, {
        reporterName: user.displayName ?? "Anonimno",
        reporterPhoto: user.photoURL ?? "",
        description: description.trim(),
        photoUrl,
        lat,
        lng,
      });
      onSubmitted();
    } catch (err) {
      console.error("Failed to report problem:", err);
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
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <p className="text-sm font-semibold">Problemi na putu</p>
              </div>
              <Button variant="ghost" size="icon-xs" onClick={onClose}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Prijavi se da bi prijavio problem na putu
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
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <p className="text-sm font-semibold">Problemi na putu</p>
            </div>
            <Button variant="ghost" size="icon-xs" onClick={onClose}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Location badge */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>{lat.toFixed(5)}, {lng.toFixed(5)}</span>
          </div>

          <Separator />

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Opis problema</label>
            <Textarea
              placeholder="Opišite problem na putu..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[80px] resize-none text-sm"
              maxLength={500}
            />
          </div>

          {/* Photo */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Fotografija (opciono)</label>
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
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="h-32 w-full rounded-lg object-cover"
                />
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="absolute right-1 top-1 bg-black/50 text-white hover:bg-black/70"
                  onClick={() => {
                    setPhotoFile(null);
                    setPhotoPreview(null);
                  }}
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
                Dodaj fotografiju
              </Button>
            )}
          </div>

          <Separator />

          {/* Info */}
          <p className="text-[10px] text-muted-foreground text-center">
            Problem postaje vidljiv svima nakon potvrde od 3 korisnika
          </p>

          {/* Submit */}
          <Button
            size="sm"
            className="w-full"
            disabled={loading || !description.trim()}
            onClick={handleSubmit}
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              "Prijavi problem"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
