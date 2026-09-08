"use client";

import { GATE_STEP } from "@repo/shared/settlement-errors";
import { useRef, useState } from "react";
import { resultFailureStep } from "@/lib/settlement-status";
import type { TriggerResult } from "./payment-demo";
import { readPaymentSse } from "./read-payment-sse";
import type { ChatSession } from "./sse-events";

export type ChatMessage = { id: string; role: "user" | "assistant"; text: string };

export function usePaymentRun({ selectedIndex }: { selectedIndex: number }) {
  const [loading, setLoading] = useState(false);
  const [animStep, setAnimStep] = useState(0);
  const [result, setResult] = useState<TriggerResult | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatError, setChatError] = useState("");
  const session = useRef<ChatSession | undefined>(undefined);
  const inFlight = useRef(false);
  const approved = result?.httpStatus === 200;
  const activeStep = loading
    ? animStep
    : result
      ? approved
        ? GATE_STEP.ATTESTATION
        : resultFailureStep(result)
      : 0;

  function resetRunState() {
    if (inFlight.current) return;
    session.current = undefined;
    setMessages([]);
    setAnimStep(0);
    setResult(null);
    setChatError("");
  }

  async function sendMessage(input: string) {
    const message = input.trim();
    if (!message || message.length > 2000 || inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setAnimStep(0);
    setChatError("");
    const id = crypto.randomUUID();
    setMessages((previous) => [
      ...previous,
      { id: `${id}-user`, role: "user", text: message },
      { id, role: "assistant", text: "" },
    ]);
    let terminal = false;
    let attempted = false;
    try {
      const response = await fetch("/api/trigger-payment", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scenarioIndex: selectedIndex, message, session: session.current }),
      });
      if (!response.ok || !response.body) throw new Error("Unable to connect to Lycoris.");
      await readPaymentSse(response.body, (event) => {
        if (event.type === "token") {
          setMessages((previous) =>
            previous.map((item) =>
              item.id === id ? { ...item, text: item.text + event.text } : item,
            ),
          );
        } else if (event.type === "session") {
          session.current = event.session.sessionId ? event.session : undefined;
        } else if (event.type === "gate") {
          if (!attempted) setResult(null);
          attempted = true;
          setAnimStep(event.step);
        } else if (event.type === "done") {
          terminal = true;
          setResult({ ...event.result, completedAt: new Date().toISOString() });
        } else if (event.type === "reply") {
          terminal = true;
        } else if (event.type === "error") {
          terminal = true;
          setChatError(event.text);
        }
      });
      if (!terminal) throw new Error("The reply was interrupted.");
    } catch {
      setChatError(
        attempted
          ? "The connection ended. A payment may have been attempted; check the evidence before requesting another report."
          : "Lycoris could not finish its reply. Please try again.",
      );
    } finally {
      setLoading(false);
      inFlight.current = false;
    }
  }

  return { activeStep, approved, loading, resetRunState, result, sendMessage, messages, chatError };
}
