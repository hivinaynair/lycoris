import type { GateState } from "../lib/settlement-gates";
import styles from "./payment-workspace.module.css";

const labels: Record<GateState, string> = {
  idle: "WAITING",
  running: "ACTIVE",
  approved: "PASSED",
  rejected: "STOPPED",
  skipped: "SKIPPED",
};

export function Wire({ d, state, kind }: { d: string; state: GateState; kind?: string }) {
  return (
    <g className={styles.wire} data-state={state} data-flow={kind}>
      <path d={d} />
      <path d={d} className={styles.packet} />
    </g>
  );
}

export function Station({
  x,
  y,
  width,
  title,
  subtitle,
  state,
  tone,
}: {
  x: number;
  y: number;
  width: number;
  title: string;
  subtitle: string;
  state: GateState;
  tone: string;
}) {
  return (
    <g
      className={styles.station}
      data-state={state}
      data-gate={tone}
      transform={`translate(${x} ${y})`}
    >
      <rect className={styles.box} width={width} height={320 - y} />
      <path className={styles.lip} d={`M0 0 h${width} v7 H0 z`} data-tone={tone} />
      <text className={styles.nodeTitle} x="11" y="29">
        {title}
      </text>
      <text className={styles.subLabel} x="11" y="45">
        {subtitle}
      </text>
      <text className={styles.status} x="11" y="65">
        {labels[state]}
      </text>
      {[0, 1].map((row) => (
        <g key={row} transform={`translate(8 ${320 - y - 44 + row * 21})`}>
          <rect className={styles.unit} width={width - 16} height="16" />
          <circle className={styles.led} cx="9" cy="8" r="2.5" />
          {[25, 30, 35, 40, 45].map((vent) => (
            <path key={vent} className={styles.vent} d={`M${vent} 4 v8`} />
          ))}
          <path className={styles.vent} d={`M${width - 39} 8 h14`} />
        </g>
      ))}
    </g>
  );
}
export function Gate({
  x,
  y,
  width,
  title,
  subtitle,
  state,
  gate,
}: {
  x: number;
  y: number;
  width: number;
  title: string;
  subtitle: string;
  state: GateState;
  gate?: string;
}) {
  return (
    <g
      className={styles.gate}
      data-state={state}
      data-gate={gate ?? title}
      transform={`translate(${x} ${y})`}
    >
      <rect className={styles.box} width={width} height="55" />
      <circle className={styles.led} cx="16" cy="20" r="4" />
      <text className={styles.nodeTitle} x="30" y="23">
        {title}
      </text>
      <text className={styles.subLabel} x="30" y="40">
        {subtitle}
      </text>
      <path className={styles.gateProgress} d={`M1 54 H${width - 1}`} />
      <text className={styles.status} x={width - 7} y="-8" textAnchor="end">
        {labels[state]}
      </text>
    </g>
  );
}

export function Robot({ stopped }: { stopped: boolean }) {
  return (
    <g className={styles.robot} data-stopped={stopped}>
      <ellipse className={styles.robotShadow} cx="0" cy="1" rx="16" ry="3" />
      <g>
        <rect x="-8" y="-24" width="6" height="20" rx="2" />
        <rect x="2" y="-24" width="6" height="20" rx="2" />
        <path d="M-10 -4 h10 v4 h-10 z M1 -4 h10 v4 H1 z" />
        <rect className={styles.robotHull} x="-11" y="-46" width="22" height="23" rx="4" />
        <path d="M-6 -40 H6 M-6 -36 H6" />
        <circle className={styles.robotCore} cy="-30" r="3" />
        <rect x="-16" y="-43" width="5" height="17" rx="2" />
        <rect x="11" y="-43" width="5" height="17" rx="2" />
        <path d="M-2 -50 v4 h4 v-4" />
        <rect className={styles.robotHull} x="-11" y="-65" width="22" height="15" rx="4" />
        <rect className={styles.visor} x="-8" y="-61" width="16" height="7" rx="3" />
        <circle className={styles.eye} cx="-3.5" cy="-57.5" r="1.5" />
        <circle className={styles.eye} cx="3.5" cy="-57.5" r="1.5" />
        <path d="M0 -65 v-7" />
        <circle className={styles.robotCore} cy="-74" r="2.5" />
      </g>
    </g>
  );
}
