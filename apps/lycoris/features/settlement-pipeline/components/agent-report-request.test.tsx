import { expect, test } from "bun:test";
import { render, screen } from "@testing-library/react";
import { AgentReportResponse } from "./agent-report-request";

const HASH = "0xc736c8f80e9645e897c2b373ecf88439a6b87cf6c1e9a9308dae02f4f03fc1c0";

test("truncates a settlement hash and links it to BaseScan", () => {
  render(
    <AgentReportResponse
      requested
      loading={false}
      error=""
      messages={[
        {
          id: "1",
          role: "assistant",
          text: `Settlement confirmed on Base Sepolia at ${HASH}.`,
        },
      ]}
    />,
  );

  const link = screen.getByRole("link", { name: "0x...c1c0" });
  expect(link.getAttribute("href")).toBe(`https://sepolia.basescan.org/tx/${HASH}`);
  expect(link.getAttribute("target")).toBe("_blank");
  expect(screen.queryByText(HASH)).toBeNull();
});
