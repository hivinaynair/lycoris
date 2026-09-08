"use client";
import { Button } from "@repo/ui/components/button";
import { useCallback, useEffect, useState } from "react";
import type { PublicForecast } from "@/server/weather";
import { sponsoredPurchaseId } from "./sponsored-payment";

export function SponsoredReport({ txHash }: { txHash: string }) {
  const [report, setReport] = useState<PublicForecast>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [purchaseId] = useState(() => sponsoredPurchaseId(txHash));
  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/weather/sponsored", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchaseId }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setReport(body);
    } catch {
      setError("Could not load the report. Retry without paying again.");
    } finally {
      setBusy(false);
    }
  }, [purchaseId]);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <section
      aria-label="Purchased weather report"
      className="mx-5 mb-5 space-y-3 border border-border bg-card p-5"
    >
      <h2 className="text-lg font-medium">Your Melbourne weather report</h2>
      {report ? (
        <div className="space-y-2 text-sm">
          <p>
            {report.temperatureC}°C · {report.rainProbabilityPercent}% rain probability
          </p>
          <p>{report.willRainAt1Pm ? "Rain is likely at 1 PM." : "Rain is unlikely at 1 PM."}</p>
          <p className="text-muted-foreground">
            {new Date(report.targetTime).toLocaleString("en-AU", {
              timeZone: "Australia/Melbourne",
            })}{" "}
            Melbourne time · {report.provider}
          </p>
        </div>
      ) : busy ? (
        <p role="status">Loading your report…</p>
      ) : null}
      {error && (
        <>
          <p role="alert">{error}</p>
          <Button disabled={busy} onClick={() => void load()}>
            Retry report
          </Button>
        </>
      )}
    </section>
  );
}
