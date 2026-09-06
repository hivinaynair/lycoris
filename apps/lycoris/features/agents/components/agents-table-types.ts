export type AgentsTableRow = {
  address: string;
  name: string;
  agentId: string;
  erc8004: string;
  delegatorAddress: string;
  maxAmountUsdc: string;
  expiry: string;
  status: "Trusted" | "Mandate capped" | "Expired mandate" | "Unregistered";
};
