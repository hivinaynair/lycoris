import type { GateState } from "../lib/settlement-gates";
import { Gate, Robot, Station, Wire } from "./payment-machine-parts";
import styles from "./payment-workspace.module.css";

const RECLAIMED_LEFT_SPACE = 62 * 0.3;
const AGENT_X = 105 - RECLAIMED_LEFT_SPACE;

type Props = {
  width: number;
  step: number;
  preview: boolean;
  chatting: boolean;
  stopped: boolean;
  state: (gate: number) => GateState;
  delivered: GateState;
};

function Agent({ stopped }: { stopped: boolean }) {
  return (
    <>
      <g data-actor="agent" transform={`translate(${AGENT_X} 300) scale(2.7)`}>
        <Robot stopped={stopped} />
      </g>
      <text className={styles.agentName} x={AGENT_X} y="325" textAnchor="middle">
        Lycoris
      </text>
      <text className={styles.subLabel} x={AGENT_X} y="343" textAnchor="middle">
        @settle-kit/agents
      </text>
    </>
  );
}

function Cloud({ x, y }: { x: number; y: number }) {
  return (
    <g className={styles.cloud} transform={`translate(${x} ${y})`}>
      <path d="M-22 11 a12 12 0 0 1 2 -23 a16 16 0 0 1 30 -3 a11 11 0 0 1 9 26 z" />
      <path d="M-9 19 v6 M2 19 v10 M13 19 v6" />
    </g>
  );
}

function BuyerExchange({ apiX, apiY, ...props }: Props & { apiX: number; apiY: number }) {
  const returning = props.step === 1 || props.step === 6;
  const preflight = props.step === 2 || props.step === 3;
  const state: GateState =
    props.chatting || preflight
      ? "idle"
      : props.step === 6
        ? props.delivered
        : props.step >= 4
          ? props.state(4)
          : props.preview && props.step === 0
            ? "running"
            : props.state(1);
  const label =
    props.step === 6
      ? "Report received"
      : props.step >= 4
        ? "Signed payment + mandate"
        : props.step === 1
          ? "402 · payment required"
          : preflight
            ? "Waiting for permission"
            : "Request weather";
  // Reuse a pair of physical wires. Their direction and caption follow the exchange.
  const upper = `M${AGENT_X} 100 C${apiX - 110} 100 ${apiX - 95} ${apiY + 20} ${apiX} ${apiY + 20}`;
  const lower = `M${apiX} ${apiY + 50} C${apiX - 110} ${apiY + 50} ${AGENT_X + 80} 115 ${AGENT_X} 100`;
  return (
    <>
      <Wire d={upper} state={returning ? "idle" : state} kind="request" />
      <Wire d={lower} state={returning ? state : "idle"} kind="response" />
      <text
        data-exchange-label="true"
        className={styles.wireLabel}
        x={apiX - 8}
        y={apiY - 14}
        textAnchor="end"
      >
        {returning ? "← " : ""}
        {label}
        {returning ? "" : " →"}
      </text>
    </>
  );
}

function Preflight({ targetX, targetY, ...props }: Props & { targetX: number; targetY: number }) {
  if (props.chatting || props.step < 2 || props.step > 3) return null;
  return (
    <g className={styles.exchangeReveal}>
      <Wire
        d={`M${AGENT_X} 100 C${AGENT_X + 95} 100 210 61 295 61 H${targetX - 35} Q${targetX} 61 ${targetX} ${targetY}`}
        state={props.state(props.step)}
        kind="preflight"
      />
      <text className={styles.wireLabel} x={(295 + targetX) / 2} y="48" textAnchor="middle">
        Check permission before signing
      </text>
    </g>
  );
}

function Funds({ apiX, apiWidth, ...props }: Props & { apiX: number; apiWidth: number }) {
  if (props.chatting || props.step !== 4) return null;
  return (
    <g className={styles.exchangeReveal}>
      <Wire
        d={`M${AGENT_X} 351 V374 H${apiX + apiWidth / 2} V320`}
        state={props.state(4)}
        kind="usdc-transfer"
      />
      <text
        className={styles.subLabel}
        x={(AGENT_X + apiX + apiWidth / 2) / 2}
        y="392"
        textAnchor="middle"
      >
        USDC · agent wallet → weather provider
      </text>
    </g>
  );
}

function Evidence({
  x,
  y,
  width,
  state,
}: {
  x: number;
  y: number;
  width: number;
  state: GateState;
}) {
  return (
    <g className={styles.attestation} data-state={state} data-gate="attestation">
      <rect className={styles.box} x={x} y={y} width={width} height="49" />
      <path d={`M${x + 12} ${y + 12} h12 v25 h-12 z m4 5 h5 m-5 5 h5`} />
      <text className={styles.nodeTitle} x={x + 33} y={y + 22}>
        Attestation
      </text>
      <text className={styles.subLabel} x={x + 33} y={y + 38}>
        Payment evidence
      </text>
    </g>
  );
}

export function PaymentMachine(props: Props) {
  const extra = props.width - 1080;
  // Reserve a wider first column for the agent's request/response exchange.
  // The remaining machines share one width and one gutter at every viewport.
  const redistributedSpace = RECLAIMED_LEFT_SPACE + 24;
  const apiX = 355 - redistributedSpace + extra * 0.28;
  const gap = 44 + redistributedSpace / 2 + extra * 0.04;
  const columnWidth = (props.width - apiX - 32 - gap * 2) / 3;
  const apiWidth = columnWidth;
  const gatesX = apiX + columnWidth + gap;
  const gateWidth = columnWidth;
  const settleX = gatesX + columnWidth + gap;
  const settleWidth = columnWidth;
  const apiState =
    props.delivered !== "idle" ? props.delivered : props.step <= 1 ? props.state(1) : "idle";
  const paidFlow = props.step >= 4 && !props.chatting ? props.state(4) : "idle";
  return (
    <g data-variant="rail">
      <g className={styles.guide}>
        <path d={`M${gatesX - gap / 2} 84 V322 M${settleX - gap / 2} 84 V322`} />
      </g>
      <BuyerExchange {...props} apiX={apiX} apiY={173} />
      <Preflight {...props} targetX={gatesX + gateWidth / 2} targetY={108} />
      <Wire
        d={`M${apiX + apiWidth} 201 C${apiX + apiWidth + gap / 2} 201 ${gatesX - gap / 2} 135 ${gatesX} 135`}
        state={paidFlow}
        kind="verify-settle"
      />
      <Wire d={`M${gatesX + gateWidth / 2} 163 V192`} state={props.state(3)} />
      <Wire
        d={`M${gatesX + gateWidth} 219 C${gatesX + gateWidth + gap / 2} 219 ${settleX - gap / 2} 201 ${settleX} 201`}
        state={props.state(4)}
      />
      <g data-actor="facilitator">
        <Gate
          x={gatesX}
          y={108}
          width={gateWidth}
          title="ERC-8004"
          subtitle="Registered identity?"
          state={props.state(2)}
        />
        <Gate
          x={gatesX}
          y={192}
          width={gateWidth}
          title="AP2 mandate"
          subtitle="May it spend this much?"
          state={props.state(3)}
        />
        <text className={styles.smallLabel} x={gatesX} y="279">
          IDENTITY + PERMISSION
        </text>
        <Station
          x={settleX}
          y={173}
          width={settleWidth}
          title="Settlement"
          subtitle="Check balance · pay"
          state={props.state(4)}
          tone="settlement"
        />
        <Wire d={`M${settleX + settleWidth / 2} 173 V121`} state={props.state(5)} />
        <Evidence x={settleX} y={72} width={settleWidth} state={props.state(5)} />
      </g>
      <Cloud x={apiX + apiWidth / 2} y={121} />
      <Station
        x={apiX}
        y={173}
        width={apiWidth}
        title="Weather API"
        subtitle="@settle-kit/server"
        state={apiState}
        tone="merchant"
      />
      {props.step >= 5 && !props.chatting && (
        <g className={styles.exchangeReveal}>
          <Wire
            d={`M${settleX + settleWidth / 2} 320 V366 H${apiX + apiWidth / 2} V320`}
            state={props.state(5)}
            kind="receipt"
          />
          <text className={styles.returnLabel} x={(settleX + apiX) / 2} y="391" textAnchor="middle">
            ← PAYMENT CONFIRMED
          </text>
        </g>
      )}
      <Funds {...props} apiX={apiX} apiWidth={apiWidth} />
      <Agent stopped={props.stopped} />
    </g>
  );
}
