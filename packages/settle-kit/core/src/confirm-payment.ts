import type { CheckoutAction } from "./state.ts";
import type { CheckoutState, SettleAdapter, SettlementHash } from "./types.ts";

export async function confirmPayment(
  getAdapter: () => SettleAdapter,
  current: Extract<CheckoutState, { status: "settling" }>,
  txHash: SettlementHash,
  setState: (action: CheckoutAction) => void,
) {
  try {
    const result = await getAdapter().confirm({
      txHash,
      quote: current.quote,
      destination: current.destination,
    });
    switch (result) {
      case "success":
        setState({ type: "SETTLED", txHash });
        return;
      case "reverted":
        setState({
          type: "FAILED",
          error: {
            code: "transfer_failed",
            message: "The transaction reverted. No USDC was transferred.",
          },
        });
        return;
      default:
        throw new Error("Unexpected receipt result");
    }
  } catch {
    setState({
      type: "CONFIRMATION_UNKNOWN",
      error: {
        code: "transfer_failed",
        message:
          "Confirmation is unavailable. Check this transaction again; do not send another payment.",
      },
    });
  }
}
