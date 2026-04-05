"use client";

import { cn } from "@/lib/utils";

interface TransportCardProps {
  label: string;
  subtitle?: string;
  icon: React.ElementType;
  onClick: () => void;
  tall?: boolean;
}

export function TransportCard({
  label,
  subtitle,
  icon: Icon,
  onClick,
  tall = false,
}: TransportCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center p-3 transition-all active:scale-[0.96]",
        tall ? "row-span-2" : ""
      )}
    >
      {/* Illustration takes up all the space */}
      <div
        className={cn(
          "w-full flex flex-1 items-center justify-center",
          tall ? "" : ""
        )}
      >
        <Icon className={cn("rounded-2xl", tall ? "h-52 w-52" : "h-32 w-40")} />
      </div>

      {/* Label sits just below */}
      <p className="mt-2 text-xs font-semibold text-gray-700">{label}</p>
      {subtitle && (
        <p className="text-[10px] text-gray-400">{subtitle}</p>
      )}
    </button>
  );
}
