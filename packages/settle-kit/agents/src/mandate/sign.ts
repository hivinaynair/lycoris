import type { HexAddress } from "@settle-kit/core";
import { MANDATE_EIP712_DOMAIN, MANDATE_EIP712_TYPES, type MandatePayload } from "./eip712";

export async function signMandate(
  signer: {
    signTypedData: (args: {
      domain: typeof MANDATE_EIP712_DOMAIN;
      types: typeof MANDATE_EIP712_TYPES;
      primaryType: "MandatePayload";
      message: MandatePayload;
    }) => Promise<HexAddress>;
  },
  payload: MandatePayload,
): Promise<HexAddress> {
  return signer.signTypedData({
    domain: MANDATE_EIP712_DOMAIN,
    types: MANDATE_EIP712_TYPES,
    primaryType: "MandatePayload",
    message: payload,
  });
}
