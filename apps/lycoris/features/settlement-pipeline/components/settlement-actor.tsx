"use client";

import { useState } from "react";
import { latestAgentReasoning } from "../lib/settlement-gates";
import { AgentSplineModel } from "./agent-spline-model";

export function AgentActor({ reasoning }: { reasoning?: string }) {
  const [robotLoaded, setRobotLoaded] = useState(false);
  const latestReasoning = latestAgentReasoning(reasoning);

  return (
    <div className="relative h-full w-44 shrink-0">
      <div
        className="absolute top-5 left-0 z-40 w-56 rounded-md border border-border bg-card px-3 py-2 text-left shadow-rail-panel transition-opacity duration-700"
        style={{ opacity: robotLoaded ? 1 : 0 }}
      >
        <p className="line-clamp-2 font-mono text-[0.68rem] leading-[1.45] text-muted-foreground">
          {latestReasoning || "I'm ready to make the payment!"}
        </p>
      </div>
      <div className="relative h-full w-full translate-x-4 overflow-visible">
        <AgentSplineModel onLoad={() => setRobotLoaded(true)} />
      </div>
    </div>
  );
}
