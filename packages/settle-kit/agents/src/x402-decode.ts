export const BASE_SEPOLIA_CAIP2 = "eip155:84532";

export function challengeFromPaymentRequired(decoded: Record<string, unknown>) {
  const resource = decoded.resource;
  return {
    scheme: decoded.scheme as string | undefined,
    network: decoded.network as string | undefined,
    maxAmountRequired: decoded.maxAmountRequired as string | undefined,
    resource:
      typeof resource === "object" && resource !== null
        ? ((resource as Record<string, unknown>).url as string | undefined)
        : (resource as string | undefined),
    description: decoded.description as string | undefined,
    error: decoded.error as string | undefined,
  };
}

export function extractAuthorizationNonce(paymentPayload: unknown) {
  const payload = (paymentPayload as { payload?: unknown }).payload as
    | Record<string, unknown>
    | undefined;
  const authorization = payload?.authorization as Record<string, unknown> | undefined;
  return typeof authorization?.nonce === "string" ? authorization.nonce : undefined;
}
