"use client";

import { useMemo, useState } from "react";
import { PageFrame, PageHead } from "@/components/page-chrome";
import { GateDetailSheet } from "@/features/settlement-pipeline/components/gate-detail-sheet";
import {
  HomeRunPanels,
  RainAnswer,
} from "@/features/settlement-pipeline/components/home-run-panels";
import { RunDemoButton } from "@/features/settlement-pipeline/components/run-demo-button";
import { ScenarioPicker } from "@/features/settlement-pipeline/components/scenario-picker";
import { SettlementScene } from "@/features/settlement-pipeline/components/settlement-scene";
import {
  fallbackRouteForAgent,
  SCENARIOS,
  scenarioIndexFromSearch,
} from "@/features/settlement-pipeline/lib/payment-demo";
import { buildProofBundle } from "@/features/settlement-pipeline/lib/payment-proof";
import { usePaymentRun } from "@/features/settlement-pipeline/lib/use-payment-run";
import { demoAgents } from "@/lib/demo-scenarios";
import type { TraceStep } from "@/lib/trace-steps";

export default function Page() {
  const [selectedIndex, setSelectedIndex] = useState(() => {
    if (typeof window === "undefined") return 0;
    return scenarioIndexFromSearch(window.location.search);
  });
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [activeGateStep, setActiveGateStep] = useState<TraceStep | null>(null);

  const selectedScenario = SCENARIOS[selectedIndex]!;
  const selectedAgent = demoAgents.find((agent) => agent.id === selectedScenario.agentName)!;
  const { activeStep, agentReasoning, approved, loading, resetRunState, result, runDemo } =
    usePaymentRun({ selectedIndex, selectedScenario, selectedAgent });

  const proofBundle = useMemo(
    () => buildProofBundle(result, selectedAgent),
    [result, selectedAgent],
  );
  const amountLabel = result?.route.price ?? fallbackRouteForAgent(selectedAgent).price;
  const routeLabel = result?.route.path ?? fallbackRouteForAgent(selectedAgent).path;

  async function copyProof() {
    await navigator.clipboard.writeText(proofBundle);
    setCopyState("copied");
    window.setTimeout(() => setCopyState("idle"), 1500);
  }

  function selectScenario(index: number) {
    if (loading) return;
    setSelectedIndex(index);
    resetRunState();
    setCopyState("idle");
  }

  return (
    <PageFrame>
      <PageHead
        eyebrow="Agent appendix"
        title="Also: an agent can pay"
        question="Is it going to rain in Melbourne at 1 PM tomorrow? Checkout is the embeddable product; this page is the Eve → x402 appendix."
      />

      <ScenarioPicker selectedIndex={selectedIndex} loading={loading} onSelect={selectScenario} />

      <div className="sm:overflow-x-auto">
        <SettlementScene
          agentLabel={selectedScenario.displayAgent}
          agentStatus={selectedAgent.status === "approved" ? "Trusted" : selectedScenario.title}
          agentReasoning={agentReasoning}
          amountLabel={amountLabel}
          routeLabel={routeLabel}
          activeStep={activeStep}
          running={loading}
          approved={Boolean(approved)}
          rejectedReason={result?.body?.error}
          action={
            <RunDemoButton
              loading={loading}
              onRun={() => {
                setCopyState("idle");
                void runDemo();
              }}
            />
          }
        />
      </div>

      <RainAnswer approved={Boolean(approved)} result={result} />

      <GateDetailSheet step={activeGateStep} onClose={() => setActiveGateStep(null)} />

      <HomeRunPanels
        result={result}
        loading={loading}
        activeStep={activeStep}
        selectedAgent={selectedAgent}
        selectedScenario={selectedScenario}
        amountLabel={amountLabel}
        proofBundle={proofBundle}
        copyState={copyState}
        onCopyProof={() => void copyProof()}
        onStepClick={setActiveGateStep}
      />
    </PageFrame>
  );
}
