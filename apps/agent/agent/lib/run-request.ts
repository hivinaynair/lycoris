import { DEFAULT_EXTERNAL_X402_URL, getDemoReportRouteByPath } from "@repo/shared/demo";

export function externalX402Url() {
  return process.env.EXTERNAL_X402_URL?.trim() || DEFAULT_EXTERNAL_X402_URL;
}

function sameUrl(a: string, b: string) {
  return new URL(a).toString().replace(/\/+$/, "") === new URL(b).toString().replace(/\/+$/, "");
}

/**
 * Payment allowlist for the `fetch_paid_resource` approval gate: the agent may
 * only pay the allowlisted external x402 resource or a known demo route served
 * by the app itself. Anything else is refused before a mandate is signed.
 */
export function isAllowedPaymentUrl(url: string, appUrl: string) {
  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return false;
  }

  if (sameUrl(target.toString(), externalX402Url())) return true;
  if (target.origin !== new URL(appUrl).origin) return false;
  return Boolean(getDemoReportRouteByPath(target.pathname));
}
