"use client";

import { cn } from "@/lib/utils";

interface FloatingPanelProps {
  children: React.ReactNode;
  className?: string;
}

export function FloatingPanel({ children, className }: FloatingPanelProps) {
  return (
    <div className="absolute inset-0 z-[1000] overflow-y-auto bg-white">
      <div
        className={cn(
          "mx-auto w-full max-w-lg px-6 py-8",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
