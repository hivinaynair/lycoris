import type { Address } from "@settle-kit/core";
import { MANDATE_EIP712_DOMAIN, MANDATE_EIP712_TYPES, type MandatePayload } from "./eip712.ts";

/**
 * Sign an AP2 mandate payload with EIP-712 (`AP2Mandate`, chain 84532).
 */
export async function signMandate(
  signer: {
    signTypedData: (args: {
      domain: typeof MANDATE_EIP712_DOMAIN;
      types: typeof MANDATE_EIP712_TYPES;
      primaryType: "MandatePayload";
      message: MandatePayload;
    }) => Promise<Address>;
  },
  payload: MandatePayload,
): Promise<Address> {
  return signer.signTypedData({
    domain: MANDATE_EIP712_DOMAIN,
    types: MANDATE_EIP712_TYPES,
    primaryType: "MandatePayload",
    message: payload,
  });
}
