import { DEMO_SCENARIO_AGENTS } from "@repo/shared/demo";
import { z } from "zod";

export const chatRequest = z.object({
  scenarioIndex: z
    .number()
    .int()
    .min(0)
    .max(DEMO_SCENARIO_AGENTS.length - 1),
  message: z.string().trim().min(1).max(2000),
  session: z
    .object({
      sessionId: z.string().min(1).max(500),
      continuationToken: z.string().min(1).max(8192).optional(),
      streamIndex: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
    })
    .optional(),
});
