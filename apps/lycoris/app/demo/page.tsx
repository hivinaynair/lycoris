"use client";

import { useMemo, useState } from "react";
import { PageFrame } from "@/components/page-chrome";
import {
  AgentReportRequest,
  AgentReportResponse,
} from "@/features/settlement-pipeline/components/agent-report-request";
import { GateDetailSheet } from "@/features/settlement-pipeline/components/gate-detail-sheet";
import {
  HomeRunPanels,
  RainAnswer,
} from "@/features/settlement-pipeline/components/home-run-panels";
import { PaymentWorkspace } from "@/features/settlement-pipeline/components/payment-workspace";
import { ScenarioPicker } from "@/features/settlement-pipeline/components/scenario-picker";
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
  const [reportRequested, setReportRequested] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [activeGateStep, setActiveGateStep] = useState<TraceStep | null>(null);

  const selectedScenario = SCENARIOS[selectedIndex]!;
  const selectedAgent = demoAgents.find((agent) => agent.id === selectedScenario.agentName)!;
  const { activeStep, approved, loading, resetRunState, result, sendMessage, messages, chatError } =
    usePaymentRun({ selectedIndex });

  const proofBundle = useMemo(
    () => buildProofBundle(result, selectedAgent),
    [result, selectedAgent],
  );
  const amountLabel = result?.route.price ?? fallbackRouteForAgent(selectedAgent).price;

  async function copyProof() {
    await navigator.clipboard.writeText(proofBundle);
    setCopyState("copied");
    window.setTimeout(() => setCopyState("idle"), 1500);
  }

  function selectScenario(index: number) {
    if (loading) return;
    setSelectedIndex(index);
    setReportRequested(false);
    resetRunState();
    setCopyState("idle");
  }

  return (
    <PageFrame className="pt-6 sm:pt-4">
      <PaymentWorkspace
        key={selectedIndex}
        hasConversation={messages.length > 0}
        chatError={chatError}
        activeStep={activeStep}
        running={loading}
        approved={Boolean(approved)}
        rejectedReason={result?.body?.error}
        hasResult={Boolean(result)}
        scenarioPicker={
          <ScenarioPicker
            selectedIndex={selectedIndex}
            loading={loading}
            onSelect={selectScenario}
          />
        }
        response={
          <AgentReportResponse
            messages={messages}
            loading={loading}
            error={chatError}
            requested={reportRequested}
          />
        }
        request={
          <AgentReportRequest
            loading={loading}
            onSend={async (message) => {
              setReportRequested(true);
              await sendMessage(message);
            }}
          />
        }
      />

      <GateDetailSheet step={activeGateStep} onClose={() => setActiveGateStep(null)} />

      <section aria-label="Payment details" className="space-y-6">
        <RainAnswer approved={Boolean(approved)} result={result} />
        <HomeRunPanels
          result={result}
          loading={loading && activeStep > 0}
          activeStep={activeStep}
          selectedAgent={selectedAgent}
          selectedScenario={selectedScenario}
          amountLabel={amountLabel}
          proofBundle={proofBundle}
          copyState={copyState}
          onCopyProof={() => void copyProof()}
          onStepClick={setActiveGateStep}
        />
      </section>
    </PageFrame>
  );
}
