"use client";

import { useEffect, useState } from "react";
import { phases } from "./payment-workspace-phases";
import { type GateState, gateState } from "./settlement-gates";

export function useWorkspacePhase({
  running,
  hasResult,
  hasConversation,
  activeStep,
  approved,
  rejectedReason,
}: {
  running: boolean;
  hasResult: boolean;
  hasConversation: boolean;
  activeStep: number;
  approved: boolean;
  rejectedReason?: string | undefined;
}) {
  const [previewStep, setPreviewStep] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(true);
  const preview = !running && !hasResult && !hasConversation;
  const chatting = !preview && !hasResult && activeStep === 0;
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!preview || reducedMotion) return;
    const timer = window.setInterval(
      () => setPreviewStep((step) => (step + 1) % phases.length),
      4500,
    );
    return () => window.clearInterval(timer);
  }, [preview, reducedMotion]);

  const step = preview ? previewStep : approved ? 6 : activeStep;
  const stopped = hasResult && !approved && !running;
  const moving = !reducedMotion && (preview || (running && activeStep > 0));
  const state = (gate: number): GateState =>
    preview
      ? step > gate
        ? "approved"
        : step === gate
          ? "running"
          : "idle"
      : gateState(gate - 1, activeStep, approved, running, rejectedReason);
  const delivered: GateState =
    (preview && step === 6) || approved ? "approved" : stopped ? "skipped" : "idle";
  const phase = phases[Math.min(Math.max(step, 0), 6)] ?? phases[0];

  return { preview, chatting, stopped, moving, step, state, delivered, phase };
}
