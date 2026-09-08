"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { DIAGRAM_BOUNDS } from "./payment-workspace-phases";

export function useWorkspaceSize() {
  const workspace = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const element = workspace.current;
    if (!element) return;
    const update = () =>
      element.style.setProperty(
        "--workspace-offset",
        `${Math.ceil(element.getBoundingClientRect().top + window.scrollY)}px`,
      );
    update();
    window.addEventListener("resize", update);
    let mounted = true;
    void document.fonts.ready.then(() => {
      if (mounted) update();
    });
    return () => {
      mounted = false;
      window.removeEventListener("resize", update);
    };
  }, []);
  const stage = useRef<HTMLDivElement>(null);
  const [canvas, setCanvas] = useState({ width: 1080, textScale: 1 });
  useEffect(() => {
    const viewport = stage.current?.parentElement;
    if (!viewport) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      const fitted = window.matchMedia("(min-width: 1100px) and (min-height: 740px)").matches;
      setCanvas({
        width:
          fitted && height > 0
            ? Math.max(1080, Math.round((width / height) * DIAGRAM_BOUNDS.height))
            : 1080,
        textScale:
          fitted && height > 0
            ? Math.round(Math.max(1, Math.min(1.5, DIAGRAM_BOUNDS.height / height)) * 100) / 100
            : 1,
      });
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);
  return { workspace, stage, canvas };
}
