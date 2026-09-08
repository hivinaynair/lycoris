import { expect, it } from "bun:test";
import { createGateProgress } from "./gate-progress";

it("does not poll before a payment, without a payer, or after the stream closes", async () => {
  let closed = false;
  let calls = 0;
  const progress = createGateProgress(
    () => {},
    () => closed,
    async () => ++calls,
  );
  await progress.flush();
  progress.paymentStarted = true;
  await progress.flush();
  expect(calls).toBe(0);
  progress.payer = "0xbuyer";
  await progress.flush();
  expect(calls).toBe(1);
  closed = true;
  await progress.flush();
  expect(calls).toBe(1);
});

it("forwards live rewinds but keeps synthetic steps forward-only", async () => {
  const steps: number[] = [];
  const progress = createGateProgress(
    (event) => steps.push(event.step),
    () => false,
    async () => 2,
  );
  progress.paymentStarted = true;
  progress.payer = "0xbuyer";
  progress.forward(4);
  progress.forward(3);
  await progress.flush();
  await progress.flush();
  expect(steps).toEqual([4, 2]);
});

it("coalesces concurrent polls and releases the polling guard after failures", async () => {
  let reject!: (error: Error) => void;
  let calls = 0;
  const progress = createGateProgress(
    () => {},
    () => false,
    () => {
      calls++;
      return calls === 1
        ? new Promise<number>((_, fail) => {
            reject = fail;
          })
        : Promise.resolve(3);
    },
  );
  progress.paymentStarted = true;
  progress.payer = "0xbuyer";
  const pending = progress.flush();
  await progress.flush();
  expect(calls).toBe(1);
  reject(new Error("temporary network failure"));
  await expect(pending).rejects.toThrow("temporary network failure");
  await progress.flush();
  expect(calls).toBe(2);
  expect(progress.lastGate).toBe(3);
});
