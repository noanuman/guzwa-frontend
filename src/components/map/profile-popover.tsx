"use client";

import { User, Settings, History, LogOut } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const MENU_ITEMS = [
  { icon: User, label: "Moj profil" },
  { icon: History, label: "Istorija vožnji" },
  { icon: Settings, label: "Podešavanja" },
  { icon: LogOut, label: "Odjavi se" },
];

export function ProfilePopover() {
  return (
    <Popover>
      <PopoverTrigger className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#F08D39] shadow-lg hover:bg-[#e07d2a]">
        <User className="h-6 w-6 text-white" />
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="start">
        {MENU_ITEMS.map((item) => (
          <button
            key={item.label}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
          >
            <item.icon className="h-4 w-4 text-gray-400" />
            {item.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
