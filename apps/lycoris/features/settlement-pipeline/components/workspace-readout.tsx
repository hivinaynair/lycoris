import type { useWorkspacePhase } from "../lib/use-workspace-phase";
import styles from "./payment-workspace-styles";

export function WorkspaceReadout({
  view,
  running,
  chatError,
  rejectedReason,
}: {
  view: ReturnType<typeof useWorkspacePhase>;
  running: boolean;
  chatError?: string;
  rejectedReason?: string;
}) {
  const { preview, chatting, stopped, step, phase } = view;
  return (
    <div className={styles.phase} aria-live={preview ? "off" : "polite"}>
      <span className={styles.phaseNumber}>{chatting ? "—" : stopped ? "×" : `0${step + 1}`}</span>
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
  );
}
