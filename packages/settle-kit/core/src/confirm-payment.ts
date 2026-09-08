import type { CheckoutAction } from "./state";
import type { CheckoutState, SettleAdapter, TxHash } from "./types";

export async function confirmPayment(
  getAdapter: () => SettleAdapter,
  current: Extract<CheckoutState, { status: "settling" }>,
  txHash: TxHash,
  setState: (action: CheckoutAction) => void,
) {
  try {
    const result = await getAdapter().confirm({
      txHash,
      quote: current.quote,
      destination: current.destination,
    });
    if (result === "success") setState({ type: "SETTLED", txHash });
    else if (result === "reverted")
      setState({
        type: "FAILED",
        error: {
          code: "transfer_failed",
          message: "The transaction reverted. No USDC was transferred.",
        },
      });
    else throw new Error("Unexpected receipt result");
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
