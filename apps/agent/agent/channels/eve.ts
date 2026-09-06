import { httpBasic, localDev, vercelOidc } from "eve/channels/auth";
import { eveChannel } from "eve/channels/eve";

const sharedSecret = process.env.LYCORIS_AGENT_SHARED_SECRET?.trim();

export default eveChannel({
  auth: [
    vercelOidc(),
    ...(sharedSecret
      ? [httpBasic({ username: "lycoris", password: sharedSecret }, { realm: "lycoris-agent" })]
      : []),
    localDev(),
  ],
});
