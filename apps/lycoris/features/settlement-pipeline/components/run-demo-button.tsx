"use client";

import { Button } from "@repo/ui/components/button";
import { Play, Zap } from "lucide-react";

export function RunDemoButton({ loading, onRun }: { loading: boolean; onRun: () => void }) {
  return (
    <Button
      size="sm"
      onClick={onRun}
      disabled={loading}
      className="h-8 rounded-md border border-foreground bg-foreground px-3 text-xs text-background hover:bg-foreground/85"
    >
      {loading ? (
        <>
          <Zap className="h-3 w-3 animate-pulse" />
          Running
        </>
      ) : (
        <>
          <Play className="h-3 w-3" />
          Run
        </>
      )}
    </Button>
  );
}
