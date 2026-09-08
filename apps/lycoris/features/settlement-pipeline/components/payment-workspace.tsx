"use client";

import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { type GateState, gateState } from "../lib/settlement-gates";
import { PaymentMachine } from "./payment-machine";
import styles from "./payment-workspace.module.css";

type Props = {
  hasConversation: boolean;
  chatError?: string;
  activeStep: number;
  running: boolean;
  approved: boolean;
  rejectedReason?: string;
  hasResult: boolean;
  request: ReactNode;
  response: ReactNode;
  scenarioPicker: ReactNode;
};

// Reserve the full wire envelope, including preflight above and receipts below.
const DIAGRAM_BOUNDS = { y: 28, height: 376 };

const phases = [
  [
    "Lycoris requests a weather report.",
    "The agents SDK requests the resource. The Weather API uses our server SDK to require payment.",
  ],
  [
    "The API asks for payment.",
    "The Weather API returns HTTP 402 with the USDC price and recipient. x402 is the protocol, not a separate service.",
  ],
  [
    "Check the agent’s identity.",
    "Lycoris first calls the facilitator’s /preclear endpoint. It checks the agent’s registered identity and mandate before signing.",
  ],
  [
    "Check permission to spend.",
    "The mandate must authorize this purchase. Preflight can stop the agent early; the facilitator enforces these checks again on the API’s payment request.",
  ],
  [
    "Send USDC to the weather provider.",
    "Lycoris retries the Weather API with a payment signature and mandate. The API calls the facilitator to verify and settle USDC from agent to merchant.",
  ],
  [
    "Save evidence of the decision.",
    "The facilitator confirms settlement and records decision evidence. The API receives the payment receipt.",
  ],
  [
    "Lycoris receives the weather report.",
    "Only after successful settlement does the Weather API return the report and receipt. Lycoris uses the report to answer you.",
  ],
] as const;

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
  const canvasWidth = canvas.width;
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
        <div className={styles.requestColumn}>{response}</div>
      </div>
      <div className={styles.scrollHint}>Scroll to follow the payment →</div>
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
        <div className={styles.phase} aria-live={preview ? "off" : "polite"}>
          <span className={styles.phaseNumber}>
            {chatting ? "—" : stopped ? "×" : `0${step + 1}`}
          </span>
          <div>
            <h3>
              {chatting
                ? running
                  ? "Lycoris is considering your request."
                  : chatError
                    ? "The reply was interrupted."
                    : "No payment was needed for this reply."
                : stopped
                  ? "The payment run stopped."
                  : phase[0]}
            </h3>
            <p>
              {chatting
                ? "The payment path activates only when Lycoris calls the paid weather tool."
                : stopped
                  ? rejectedReason || "The run did not complete. Inspect the decision log below."
                  : phase[1]}
            </p>
          </div>
        </div>
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
