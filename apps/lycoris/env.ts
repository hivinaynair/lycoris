import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    SPONSORED_WALLET_ADDRESS: z
      .string()
      .regex(/^0x[0-9a-fA-F]{40}$/)
      .optional(),
    CDP_API_KEY_ID: z.string().optional(),
    CDP_API_KEY_SECRET: z.string().optional(),
    CDP_WALLET_SECRET: z.string().optional(),
    PAY_TO_ADDRESS: z.string().startsWith("0x"),
    FACILITATOR_URL: z.string().url(),
    AGENT_URL: z.string().url(),
    DATABASE_URL: z.string().url(),
    // Basic-auth password for the agent's eve channel. Unset locally, where
    // the channel's localDev() rule admits the request instead.
    LYCORIS_AGENT_SHARED_SECRET: z.string().optional(),
  },
  client: {},
  runtimeEnv: {
    SPONSORED_WALLET_ADDRESS: process.env.SPONSORED_WALLET_ADDRESS,
    CDP_API_KEY_ID: process.env.CDP_API_KEY_ID,
    CDP_API_KEY_SECRET: process.env.CDP_API_KEY_SECRET,
    CDP_WALLET_SECRET: process.env.CDP_WALLET_SECRET,
    PAY_TO_ADDRESS: process.env.PAY_TO_ADDRESS,
    FACILITATOR_URL: process.env.FACILITATOR_URL,
    AGENT_URL: process.env.AGENT_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    LYCORIS_AGENT_SHARED_SECRET: process.env.LYCORIS_AGENT_SHARED_SECRET,
  },
  skipValidation: Boolean(process.env.SKIP_ENV_VALIDATION),
  emptyStringAsUndefined: true,
});
