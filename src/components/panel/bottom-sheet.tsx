"use client";

import { cn } from "@/lib/utils";

interface BottomSheetProps {
  children: React.ReactNode;
  expanded?: boolean;
  className?: string;
}

export function BottomSheet({
  children,
  expanded = false,
  className,
}: BottomSheetProps) {
  return (
    <div
      className={cn(
        "absolute bottom-0 left-0 right-0 z-[1000] rounded-t-3xl bg-white shadow-[0_-4px_24px_rgba(0,0,0,0.12)] transition-all duration-300 ease-out",
        expanded ? "top-24" : "max-h-[45vh]",
        className
      )}
    >
      {/* Drag handle */}
      <div className="flex justify-center pt-3 pb-2">
        <div className="h-1 w-10 rounded-full bg-gray-300" />
      </div>
      <div className="overflow-y-auto px-5 pb-8">{children}</div>
    </div>
  );
}
