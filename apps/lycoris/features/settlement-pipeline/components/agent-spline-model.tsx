"use client";

import dynamic from "next/dynamic";
import { Component, type ReactNode, useState } from "react";

const Spline = dynamic(() => import("@splinetool/react-spline"), {
  ssr: false,
});

const AGENT_SCENE_URL = "https://prod.spline.design/ULW-5X4laAiO8UFv/scene.splinecode";

class SplineStage extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/agent.png" alt="" className="h-full w-full object-contain" />
      );
    }
    return this.props.children;
  }
}

export function AgentSplineModel({ onLoad }: { onLoad?: () => void }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <SplineStage>
      <div
        className="absolute top-1/2 left-1/2 h-[420px] w-[220px] -translate-x-1/2 -translate-y-[43%] transition-opacity duration-700"
        style={{ opacity: loaded ? 1 : 0 }}
      >
        <Spline
          scene={AGENT_SCENE_URL}
          className="h-full w-full"
          onLoad={() => {
            setLoaded(true);
            onLoad?.();
          }}
        />
      </div>
    </SplineStage>
  );
}
