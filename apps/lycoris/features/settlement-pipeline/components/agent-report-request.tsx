"use client";

import { Alert, AlertDescription } from "@repo/ui/components/alert";
import { Button } from "@repo/ui/components/button";
import { ArrowUpRight, Loader2 } from "lucide-react";
import type { ChatMessage } from "../lib/use-payment-run";
import styles from "./payment-workspace-styles";

export function AgentReportRequest({
  loading,
  onSend,
}: {
  loading: boolean;
  onSend: (message: string) => Promise<void>;
}) {
  return (
    <section aria-label="Request a report" className={styles.reportRequest}>
      <Button
        size="sm"
        disabled={loading}
        aria-label="Get me the report"
        onClick={() => void onSend("Get me the report.")}
      >
        {loading ? <Loader2 className="animate-spin" /> : <ArrowUpRight />}
        {loading ? "Getting your report…" : "Get me the report"}
      </Button>
    </section>
  );
}

export function AgentReportResponse({
  messages,
  loading,
  error,
  requested,
}: {
  messages: ChatMessage[];
  loading: boolean;
  error: string;
  requested: boolean;
}) {
  const reply = [...messages].reverse().find((message) => message.role === "assistant")?.text;
  return (
    <section aria-label="Lycoris response" className={styles.reportResponse}>
      {requested && (
        <>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Lycoris</p>
          <div className={styles.reportReply}>
            <p role="status">{reply || (loading ? "Finding your weather report…" : "")}</p>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        </>
      )}
    </section>
  );
}
