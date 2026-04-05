"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { MapPin } from "./map-pins";

const TYPE_LABELS: Record<MapPin["type"], string> = {
  parking: "Parking mesto",
};

interface PinPopupProps {
  pin: MapPin | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PinPopup({ pin, open, onOpenChange }: PinPopupProps) {
  if (!pin) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{pin.title}</DialogTitle>
          <DialogDescription>{TYPE_LABELS[pin.type]}</DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{pin.description}</p>
      </DialogContent>
    </Dialog>
  );
}
