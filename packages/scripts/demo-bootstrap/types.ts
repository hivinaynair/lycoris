import type { MandatePayload } from "@repo/shared/mandate";
import type { DemoAgentName } from "@repo/shared/types";
import type { Address, Hex } from "viem";

export type AgentFromServer = {
  agentName: DemoAgentName;
  address: Address;
};

export type SignedMandateForBootstrap = {
  payload: MandatePayload;
  signature: Hex;
};
