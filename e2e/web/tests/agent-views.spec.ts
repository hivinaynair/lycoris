import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("one animated payment machine previews without paying, respects reduced motion, and fits both themes and mobile", async ({
  page,
}, info) => {
  test.setTimeout(60000);
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  let payments = 0;
  page.on("request", (request) => {
    if (request.url().includes("/api/trigger-payment")) payments++;
  });
  await page.goto("/demo");
  const machine = page.getByRole("region", { name: "Agent payment machine", exact: true });
  await expect(machine).toHaveAttribute("data-mode", "preview");
  await expect(machine.getByRole("combobox", { name: "Payment scenario" })).toContainText(
    "Successful payment",
  );
  await expect(machine.locator(":scope > header")).toHaveCount(0);
  await expect(machine.getByRole("radio")).toHaveCount(0);
  const diagram = machine.locator('svg[role="img"]');
  await expect(diagram.getByText("Weather API", { exact: true })).toHaveCount(1);
  await expect(diagram.getByText("x402", { exact: true })).toHaveCount(0);
  await expect(diagram.locator('[data-actor="facilitator"] [data-gate="ERC-8004"]')).toHaveCount(1);
  await expect(diagram.locator('[data-actor="facilitator"] [data-gate="AP2 mandate"]')).toHaveCount(
    1,
  );
  await expect(diagram.locator('[data-actor="facilitator"] [data-gate="settlement"]')).toHaveCount(
    1,
  );
  for (const flow of ["request", "response", "verify-settle"]) {
    await expect(diagram.locator(`[data-flow="${flow}"]`)).toHaveCount(1);
  }
  await expect(machine.getByRole("heading", { name: "Check permission to spend." })).toBeVisible({
    timeout: 25000,
  });
  await expect(page.getByRole("button", { name: /Pause animation|Resume animation/ })).toHaveCount(
    0,
  );
  await page.screenshot({ path: info.outputPath("payment-machine-desktop.png"), fullPage: true });
  await expect(machine).toHaveAttribute("data-moving", "true");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(machine).toHaveAttribute("data-moving", "false");
  expect(
    await machine
      .locator('svg[role="img"]')
      .evaluate(
        (svg) =>
          svg
            .getAnimations({ subtree: true })
            .filter((animation) => animation.playState === "running").length,
      ),
  ).toBe(0);
  for (const theme of ["dark", "light"] as const) {
    const toggle = page.getByRole("button", { name: `Switch to ${theme} theme` });
    if (await toggle.count()) await toggle.click();
    expect(
      (await new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa"]).analyze())
        .violations,
    ).toEqual([]);
    await page.screenshot({
      path: info.outputPath(`payment-machine-${theme}.png`),
      fullPage: true,
    });
  }
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1280, height: 768 },
    { width: 1181, height: 994 },
  ]) {
    await page.setViewportSize(viewport);
    await expect
      .poll(async () => {
        const bounds = await machine.boundingBox();
        return (bounds?.y ?? 0) + (bounds?.height ?? 0);
      })
      .toBeLessThanOrEqual(viewport.height);
    await expect
      .poll(async () => {
        const bounds = await machine.boundingBox();
        return Math.abs(viewport.height - ((bounds?.y ?? 0) + (bounds?.height ?? 0)));
      })
      .toBeLessThanOrEqual(1);
    expect(
      (await page.getByRole("region", { name: "Payment details", exact: true }).boundingBox())?.y,
    ).toBeGreaterThanOrEqual(viewport.height);
    await expect
      .poll(() =>
        machine.locator('svg[role="img"]').evaluate((svg) => {
          const drawing = svg.querySelector("[data-artwork]")?.getBoundingClientRect();
          const frame = svg.getBoundingClientRect();
          return drawing
            ? Math.max(frame.top - drawing.top, drawing.bottom - frame.bottom)
            : Infinity;
        }),
      )
      .toBeLessThanOrEqual(0);
    const robotBounds = await machine.locator('[data-actor="agent"]').boundingBox();
    const labelBounds = await machine.locator("[data-exchange-label]").boundingBox();
    expect(labelBounds?.x).toBeGreaterThan((robotBounds?.x ?? 0) + (robotBounds?.width ?? 0));
    const columns = await Promise.all(
      ["merchant", "ERC-8004", "settlement"].map((gate) =>
        machine.locator(`[data-gate="${gate}"] > rect`).first().boundingBox(),
      ),
    );
    const [api, facilitator, settlement] = columns;
    expect(api && facilitator && settlement).toBeTruthy();
    if (api && facilitator && settlement) {
      expect(Math.abs(api.width - facilitator.width)).toBeLessThan(1);
      expect(Math.abs(api.width - settlement.width)).toBeLessThan(1);
      expect(
        Math.abs(
          facilitator.x - api.x - api.width - (settlement.x - facilitator.x - facilitator.width),
        ),
      ).toBeLessThan(1);
      expect(Math.abs(api.y - settlement.y)).toBeLessThan(1);
    }
    const chat = machine.getByRole("region", { name: "Request a report" });
    await expect(chat.getByRole("combobox")).toHaveCount(0);
    await expect(chat.getByRole("textbox")).toHaveCount(0);
    expect(
      (await chat.getByRole("button", { name: "Get me the report", exact: true }).boundingBox())
        ?.height,
    ).toBeLessThanOrEqual(36);
    expect(await chat.evaluate((node) => node.scrollHeight <= node.clientHeight + 1)).toBe(true);
    await page.screenshot({
      path: info.outputPath(`payment-machine-${viewport.width}x${viewport.height}.png`),
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
  const circuit = page.getByRole("region", {
    name: "Payment circuit, scroll horizontally on small screens",
  });
  const reportButton = machine.getByRole("button", { name: "Get me the report", exact: true });
  // ResizeObserver updates the fitted SVG after viewport changes. Measure the
  // final mobile arrangement, rather than mixing bounds from two layout frames.
  await expect
    .poll(async () => {
      const reportBounds = await reportButton.boundingBox();
      const circuitBounds = await circuit.boundingBox();
      return Boolean(
        reportBounds &&
          circuitBounds &&
          reportBounds.height >= 44 &&
          reportBounds.y + reportBounds.height < circuitBounds.y,
      );
    })
    .toBe(true);
  await expect(machine.getByRole("region", { name: "Lycoris response" })).toBeHidden();
  await expect.poll(() => circuit.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
  await circuit.focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => circuit.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
  await expect(
    machine.getByRole("button", { name: "Get me the report", exact: true }),
  ).toBeVisible();
  expect(
    (await new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);
  await machine.getByRole("combobox", { name: "Payment scenario" }).click();
  await page.getByRole("option", { name: "Unregistered agent", exact: true }).click();
  await expect(machine.getByRole("combobox", { name: "Payment scenario" })).toContainText(
    "Unregistered agent",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: info.outputPath("payment-machine-mobile.png"), fullPage: true });
  expect(payments).toBe(0);
  expect(browserErrors).toEqual([]);
});

for (const outcome of [
  {
    name: "mandate rejection",
    httpStatus: 402,
    error: "mandate_amount_exceeded",
    gate: "AP2 mandate",
  },
  { name: "identity rejection", httpStatus: 403, error: "identity_not_found", gate: "ERC-8004" },
  {
    name: "settlement failure",
    httpStatus: 500,
    error: "settlement_transaction_failed",
    gate: "settlement",
  },
  { name: "success", httpStatus: 200, error: undefined, gate: undefined },
]) {
  test(`payment machine follows a mocked ${outcome.name} and resets on scenario change`, async ({
    page,
  }, info) => {
    let payments = 0;
    await page.route("**/api/trigger-payment", async (route) => {
      payments++;
      await route.fulfill({
        contentType: "text/event-stream",
        body: `data: ${JSON.stringify({ type: "done", result: { httpStatus: outcome.httpStatus, route: { id: "basic", path: "/api/weather/public", price: "0.1 USDC" }, agent: null, body: { error: outcome.error } } })}\n\n`,
      });
    });
    await page.goto("/demo");
    await page.getByRole("button", { name: "Get me the report", exact: true }).click();
    const machine = page.getByRole("region", { name: "Agent payment machine", exact: true });
    await expect(machine).toHaveAttribute("data-mode", "live");
    await expect(machine).toHaveAttribute("data-moving", "false");
    if (outcome.gate) {
      await expect(machine.locator(`[data-gate="${outcome.gate}"]`)).toHaveAttribute(
        "data-state",
        "rejected",
      );
      await expect(machine.locator('[data-gate="merchant"]')).toHaveAttribute(
        "data-state",
        "skipped",
      );
      await expect(
        machine.getByRole("heading", { name: "The payment run stopped.", exact: true }),
      ).toBeVisible();
    } else {
      await expect(machine.locator('[data-gate="settlement"]')).toHaveAttribute(
        "data-state",
        "approved",
      );
      await expect(machine.locator('[data-gate="merchant"]')).toHaveAttribute(
        "data-state",
        "approved",
      );
      await expect(
        machine.getByRole("heading", { name: "Lycoris receives the weather report.", exact: true }),
      ).toBeVisible();
    }
    await page.screenshot({ path: info.outputPath(`${outcome.name}.png`), fullPage: true });
    await machine.getByRole("combobox", { name: "Payment scenario" }).click();
    await page.getByRole("option", { name: "Spending limit exceeded", exact: true }).click();
    await expect(machine).toHaveAttribute("data-mode", "preview");
    expect(payments).toBe(1);
  });
}

test("report requests send the prompt, preserve the session, and show only the latest reply", async ({
  page,
}) => {
  const requests: Record<string, unknown>[] = [];
  const session = {
    sessionId: "test-conversation",
    continuationToken: "test-token",
    streamIndex: 8,
  };
  await page.route("**/api/trigger-payment", async (route) => {
    requests.push(route.request().postDataJSON());
    const text =
      requests.length === 1
        ? "Hi, I’m Lycoris. How can I help?"
        : "I use the Eve framework and Settle Kit.";
    await route.fulfill({
      contentType: "text/event-stream",
      body: [{ type: "token", text }, { type: "session", session }, { type: "reply" }]
        .map((event) => `data: ${JSON.stringify(event)}\n\n`)
        .join(""),
    });
  });
  await page.goto("/demo");
  const machine = page.getByRole("region", { name: "Agent payment machine", exact: true });
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "An AI agent pays on its own.Our SDK handles payment.",
  );
  await page.getByRole("button", { name: "Get me the report", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Hi, I’m Lycoris.");
  await expect(machine).toHaveAttribute("data-moving", "false");
  await expect(
    machine.getByRole("heading", { name: "No payment was needed for this reply.", exact: true }),
  ).toBeVisible();
  await expect(machine.locator('[data-gate="settlement"]')).toHaveAttribute("data-state", "idle");
  await page.getByRole("button", { name: "Get me the report", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("I use the Eve framework");
  expect(requests).toEqual([
    { scenarioIndex: 0, message: "Get me the report." },
    { scenarioIndex: 0, message: "Get me the report.", session },
  ]);
  await machine.getByRole("combobox", { name: "Payment scenario" }).click();
  await page.getByRole("option", { name: "Unregistered agent", exact: true }).click();
  await expect(page.getByRole("status")).toHaveCount(0);
  await page.getByRole("button", { name: "Get me the report", exact: true }).click();
  await expect.poll(() => requests.length).toBe(3);
  expect(requests[2]).toEqual({ scenarioIndex: 2, message: "Get me the report." });
});

test("the report button never auto-sends and an interrupted stream never claims success", async ({
  page,
}) => {
  let requests = 0;
  await page.route("**/api/trigger-payment", async (route) => {
    requests++;
    await route.fulfill({
      contentType: "text/event-stream",
      body: 'data: {"type":"gate","step":1}\n\ndata: {"type":"token","text":"Fetching your report…"}\n\n',
    });
  });
  await page.goto("/demo");
  expect(requests).toBe(0);
  await expect(page.getByRole("textbox", { name: "Message Lycoris" })).toHaveCount(0);
  await page.getByRole("button", { name: "Get me the report", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Lycoris response" }).getByRole("alert"),
  ).toContainText("A payment may have been attempted");
  await expect(page.getByText("Report received", { exact: true })).toHaveCount(0);
  expect(requests).toBe(1);
});

test("animation reserves wire space without moving the robot or payment blocks", async ({
  page,
}) => {
  await page.clock.install();
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1181, height: 994 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/demo");
    const machine = page.getByRole("region", { name: "Agent payment machine", exact: true });
    await expect(machine).toHaveAttribute("data-moving", "true");
    await page.evaluate(() => document.fonts.ready);
    await page.clock.runFor(100);
    const geometry = () =>
      machine
        .locator(
          '[data-actor="agent"], [data-gate="merchant"] > rect:first-child, [data-gate="ERC-8004"] > rect:first-child, [data-gate="settlement"] > rect:first-child',
        )
        .evaluateAll((nodes) =>
          nodes.map((node) => {
            const { x, y, width, height } = node.getBoundingClientRect();
            return { x, y, width, height };
          }),
        );
    const initial = await geometry();
    const viewBox = await machine.locator('svg[role="img"]').getAttribute("viewBox");
    if (!viewBox) throw new Error("Missing diagram viewBox");
    for (let step = 1; step <= 7; step++) {
      await page.clock.runFor(4500);
      await expect(machine.locator('svg[role="img"]')).toHaveAttribute("viewBox", viewBox);
      const current = await geometry();
      for (let i = 0; i < initial.length; i++) {
        const before = initial[i];
        const after = current[i];
        if (!before || !after) throw new Error("Missing payment block");
        for (const key of ["x", "y", "width", "height"] as const) {
          expect(
            Math.abs(after[key] - before[key]),
            `step ${step}, ${viewport.width}px, block ${i}, ${key}`,
          ).toBeLessThan(1);
        }
      }
      expect(
        await machine.locator('svg[role="img"]').evaluate((svg) => {
          const drawing = svg.querySelector("[data-artwork]")?.getBoundingClientRect();
          const frame = svg.getBoundingClientRect();
          return !!drawing && drawing.top >= frame.top && drawing.bottom <= frame.bottom;
        }),
      ).toBe(true);
    }
  }
});
