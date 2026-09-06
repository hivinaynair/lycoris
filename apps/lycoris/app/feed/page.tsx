export const revalidate = 5;

import { Badge } from "@repo/ui/components/badge";
import { Card, CardContent } from "@repo/ui/components/card";
import { Suspense } from "react";
import { PageFrame, PageHead } from "@/components/page-chrome";
import { FeedTable } from "@/features/feed/components/feed-table";
import { ViewerToggle } from "@/features/feed/components/viewer-toggle";
import { getAgentsWithMandates } from "@/server/agents";
import { getAttestations, parseViewerRole } from "@/server/attestations";

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const role = parseViewerRole(view);
  const [rows, agents] = await Promise.all([getAttestations(role), getAgentsWithMandates()]);

  const agentNames: Record<string, string> = {};
  for (const a of agents) agentNames[a.address.toLowerCase()] = a.name;

  const question =
    role === "public"
      ? "Each row is a commitment. Disclose the record to verify it."
      : "Each row is a lifecycle trace: approved settlements include on-chain proof; rejections preserve the policy snapshot.";

  return (
    <PageFrame>
      <PageHead
        eyebrow="Compliance flight recorder"
        title="Every attempt, on the record"
        question={question}
        right={
          <div className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                Attestations
              </p>
              <p className="mt-1 font-mono text-2xl font-semibold">{rows.length}</p>
            </div>
            <Badge className="text-muted-foreground">Base Sepolia</Badge>
          </div>
        }
      />

      <Card className="gap-0 rounded-xl border border-border bg-card p-0 shadow-none">
        <CardContent className="p-3">
          <Suspense>
            <ViewerToggle />
          </Suspense>
          <Suspense>
            <FeedTable rows={rows} agentNames={agentNames} role={role} />
          </Suspense>
        </CardContent>
      </Card>
    </PageFrame>
  );
}
