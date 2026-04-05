"use client";

import {
  SlidersHorizontal,
  ParkingCircle,
  TriangleAlert,
  Ban,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Toggle } from "@/components/ui/toggle";
import { FILTER_TAGS } from "./filter-tags";

const ICONS: Record<string, React.ElementType> = {
  ParkingCircle,
  TriangleAlert,
  Ban,
};

interface FilterPopoverProps {
  activeFilters: Set<string>;
  onToggle: (id: string) => void;
}

export function FilterPopover({ activeFilters, onToggle }: FilterPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-white shadow-lg hover:bg-gray-100">
        <SlidersHorizontal className="h-6 w-6 text-gray-600" />
      </PopoverTrigger>
      <PopoverContent className="w-44 p-3" align="end">
        <p className="mb-3 text-sm font-medium">Filteri</p>
        <div className="flex flex-wrap gap-2">
          {FILTER_TAGS.map((tag) => {
            const Icon = ICONS[tag.icon];
            return (
              <Toggle
                key={tag.id}
                pressed={activeFilters.has(tag.id)}
                onPressedChange={() => onToggle(tag.id)}
                variant="outline"
                size="sm"
                className="justify-start gap-2 rounded-full px-4"
              >
                <Icon className="h-4 w-4" />
                {tag.label}
              </Toggle>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
