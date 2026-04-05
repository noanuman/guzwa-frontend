"use client";

import { Card, CardContent } from "@/components/ui/card";

export function BottomBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-[1000] animate-in fade-in slide-in-from-bottom-3 duration-300">
      <Card className="rounded-none rounded-t-2xl border-0 shadow-2xl bg-background/95 backdrop-blur-md">
        {/* Drag handle */}
        <div className="flex justify-center pt-2">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/20" />
        </div>
        <CardContent className="mx-auto flex max-w-lg items-center justify-center gap-5 px-5 py-3">
          {children}
        </CardContent>
      </Card>
    </div>
  );
}
