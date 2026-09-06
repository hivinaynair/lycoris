import { z } from "zod";

const schema = z.object({
  FACILITATOR_PRIVATE_KEY: z.custom<`0x${string}`>(
    (v) => typeof v === "string" && v.startsWith("0x"),
  ),
  ATTESTATION_REGISTRY_ADDRESS: z.custom<`0x${string}`>(
    (v) => typeof v === "string" && v.startsWith("0x"),
  ),
  PORT: z.coerce.number().default(3001),
});

export const env = schema.parse(process.env);
