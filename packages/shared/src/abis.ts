// ERC-8004 agent identity registry — deployed at the same vanity address on all supported chains
export const ERC8004_ADDRESS = "0x8004A818BFB912233c491871b3d84c89A494BD9e" as const;

// Base Sepolia USDC (Circle)
export const BASE_SEPOLIA_USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const;

export const ERC20_BALANCE_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

export const ERC8004_ABI = [
  // ERC-721 Transfer event — emitted on register(); tokenId is the agentId
  {
    name: "Transfer",
    type: "event",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "tokenId", type: "uint256", indexed: true },
    ],
  },
  {
    name: "register",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "agentURI", type: "string" }],
    outputs: [{ name: "agentId", type: "uint256" }],
  },
  {
    name: "tokenURI",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "getAgentWallet",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

export const ATTESTATION_REGISTRY_ABI = [
  {
    name: "attest",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "commitment", type: "bytes32" }],
    outputs: [],
  },
  {
    name: "AttestedCommitment",
    type: "event",
    inputs: [
      { name: "commitment", type: "bytes32", indexed: true },
      { name: "timestamp", type: "uint64", indexed: false },
    ],
  },
] as const;

export const ATTESTED_COMMITMENT_EVENT = ATTESTATION_REGISTRY_ABI[1];
