import { BASE_SEPOLIA_CAIP2 } from "@repo/shared/chains";
import { x402Facilitator } from "@x402/core/facilitator";
import { ExactEvmScheme } from "@x402/evm/exact/facilitator";
import { onAfterSettle, onBeforeSettle, onSettleFailure } from "../hooks/settle.js";
import { onBeforeVerify } from "../hooks/verify.js";
import { facilitatorSigner } from "./clients.js";
import { verifyDeps } from "./deps.js";

export const facilitator = new x402Facilitator();

facilitator
  .register(BASE_SEPOLIA_CAIP2, new ExactEvmScheme(facilitatorSigner, { simulateInSettle: true }))
  .onBeforeVerify((ctx) => onBeforeVerify(ctx, verifyDeps))
  .onBeforeSettle(onBeforeSettle)
  .onAfterSettle(onAfterSettle)
  .onSettleFailure(onSettleFailure);
