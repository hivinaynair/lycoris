"use client";

import type { CSSProperties, ReactNode } from "react";
import { DIAGRAM_BOUNDS } from "../lib/payment-workspace-phases";
import { useWorkspacePhase } from "../lib/use-workspace-phase";
import { useWorkspaceSize } from "../lib/use-workspace-size";
import { PaymentMachine } from "./payment-machine";
import styles from "./payment-workspace-styles";
import { WorkspaceReadout } from "./workspace-readout";

type Props = {
  hasConversation: boolean;
  chatError?: string | undefined;
  activeStep: number;
  running: boolean;
  approved: boolean;
  rejectedReason?: string | undefined;
  hasResult: boolean;
  request: ReactNode;
  response: ReactNode;
  scenarioPicker: ReactNode;
};

export function PaymentWorkspace({
  hasConversation,
  chatError,
  activeStep,
  running,
  approved,
  rejectedReason,
  hasResult,
  request,
  response,
  scenarioPicker,
}: Props) {
  const { workspace, stage, canvas } = useWorkspaceSize();
  const canvasWidth = canvas.width;
  const view = useWorkspacePhase({
    running,
    hasResult,
    hasConversation,
    activeStep,
    approved,
    rejectedReason,
  });
  const { preview, chatting, stopped, moving, step, state, delivered } = view;

  return (
    <section
      ref={workspace}
      aria-label="Agent payment machine"
      className={styles.workspace}
      data-mode={preview ? "preview" : "live"}
      data-moving={moving}
    >
      <div className={styles.intro}>
        <div>
          <h1>
            An AI agent pays on its own.
            <br />
            <span>Our SDK handles payment.</span>
          </h1>
          <p className={styles.explanation}>
            You set the spending limits. Our agents SDK buys the report; our server SDK lets the
            Weather API accept payment.
          </p>
        </div>
        <div
          className={styles.requestColumn}
          data-has-response={hasConversation || running || Boolean(chatError)}
        >
          {response}
        </div>
      </div>
      <div className={styles.scrollHint}>Swipe to follow the payment →</div>
      <section
        className={styles.scroll}
        aria-label="Payment circuit, scroll horizontally on small screens"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard users must be able to scroll the circuit.
        tabIndex={0}
      >
        <div className={styles.stage} ref={stage}>
          {/* Geometry adapted from the server rig supplied by the user (pleurat.com/ai). */}
          <svg
            className={styles.rig}
            style={{ "--rig-text-scale": canvas.textScale } as CSSProperties}
            viewBox={`0 ${DIAGRAM_BOUNDS.y} ${canvasWidth} ${DIAGRAM_BOUNDS.height}`}
            preserveAspectRatio="xMidYMin meet"
            role="img"
            aria-label="Lycoris requests the Weather API, receives HTTP 402, and retries with a payment signature and mandate. The Weather API calls the facilitator for identity, mandate, balance, and settlement checks. USDC moves from agent to merchant, then the API returns the report. A separate preflight connects Lycoris to the facilitator."
          >
            <g data-artwork="true">
              <PaymentMachine
                width={canvasWidth}
                step={step}
                preview={preview}
                chatting={chatting}
                stopped={stopped}
                state={state}
                delivered={delivered}
              />
            </g>
          </svg>
        </div>
      </section>
      <div className={styles.readout}>
        <WorkspaceReadout
          view={view}
          running={running}
          chatError={chatError}
          rejectedReason={rejectedReason}
        />
        <div className={styles.controls}>
          {scenarioPicker}
          {request}
        </div>
      </div>
      <footer className={styles.footer}>
        <span>
          {preview
            ? "This animation is a preview. Select “Get me the report” to ask Lycoris to buy a forecast with test USDC."
            : "Block highlights follow the live run. Moving packets illustrate each exchange."}
        </span>
        <span>Agents SDK + Server SDK</span>
      </footer>
    </section>
  );
}
