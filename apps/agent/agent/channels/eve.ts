import { httpBasic, localDev, vercelOidc } from "eve/channels/auth";
import { defaultEveAuth, eveChannel } from "eve/channels/eve";

import { paymentScope } from "../lib/payment-scope.js";

const sharedSecret = process.env.LYCORIS_AGENT_SHARED_SECRET?.trim();

export default eveChannel({
  onMessage(ctx) {
    const caller = defaultEveAuth(ctx);
    if (!caller) throw new Error("Authenticated caller required");
    const scope = paymentScope(ctx.eve.request.headers.get("x-lycoris-agent"), process.env.APP_URL);
    return {
      auth: { ...caller, attributes: { ...caller.attributes, paymentAgent: scope.agentName } },
      context: [
        `Current time in Melbourne: ${new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", dateStyle: "full", timeStyle: "short" }).format(new Date())}. The available forecast is for the next 1 PM there.`,
      ],
    };
  },
  auth: [
    vercelOidc(),
    ...(sharedSecret
      ? [httpBasic({ username: "lycoris", password: sharedSecret }, { realm: "lycoris-agent" })]
      : []),
    localDev(),
  ],
});
