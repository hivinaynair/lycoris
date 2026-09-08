"use client";

import { Button } from "@repo/ui/components/button";
import { useCheckout } from "@settle-kit/react";
import { useState } from "react";
import { signWeatherAccess } from "@/lib/get-browser-signer";
import { weatherAccessMessage } from "@/lib/weather-access-message";
import type { PublicForecast } from "@/server/weather";

export function WeatherAccess({ simulated }: { simulated: boolean }) {
  const { state } = useCheckout();
  const [report, setReport] = useState<PublicForecast | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [signature, setSignature] = useState<`0x${string}`>();
  if (state.status !== "settled") return null;
  const txHash = state.txHash;
  async function unlock() {
    setBusy(true);
    setError("");
    try {
      const signed = signature ?? (await signWeatherAccess(weatherAccessMessage(txHash)));
      setSignature(signed);
      const response = await fetch("/api/weather/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txHash, signature: signed }),
      });
      const body = await response.json();
      if (!response.ok) {
        if (response.status === 403) setSignature(undefined);
        throw new Error(body.error ?? "Could not load report.");
      }
      setReport(body);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not unlock report. Retry without paying again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      aria-label="Purchased weather report"
      className="space-y-3 border border-border bg-card p-5 mb-5 mx-5"
    >
      <h2 className="text-lg font-medium">
        {simulated ? "Sample report unlocked" : "Your Melbourne weather report"}
      </h2>
      {simulated ? (
        <p className="text-sm text-muted-foreground">
          Simulation only · sample data, not a live forecast: Melbourne at 1 PM, 18°C, 12% rain
          probability. No payment was made.
        </p>
      ) : report ? (
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
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Sign a free ownership message with the paying wallet. The server verifies the transfer
            before releasing the report. Access lasts 15 minutes after confirmation; retries do not
            charge again.
          </p>
          <Button disabled={busy} onClick={() => void unlock()}>
            {busy ? "Verifying and loading…" : "Unlock weather report"}
          </Button>
        </>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
