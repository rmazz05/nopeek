import { test, expect } from "@playwright/test";
test("room dialog contains keyboard focus and restores its trigger", async ({
  page,
}) => {
  await page.goto("/");
  const trigger = page.getByRole("button", {
    name: "Create a room",
    exact: true,
  });
  await trigger.focus();
  await trigger.press("Enter");
  await expect(page.getByLabel("Room name")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(trigger).toBeFocused();
});
test("landing explains the game and opens practice", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Good at secrets? Prove it." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Try it solo", exact: true }).click();
  await expect(page.getByText("SOLO PRACTICE", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Submit guess", exact: true }),
  ).toBeDisabled();
  for (const symbol of ["Circle", "Diamond", "Triangle", "Square", "Star"])
    await page
      .getByRole("button", { name: `Choose ${symbol}`, exact: true })
      .click();
  await page.getByRole("button", { name: "Submit guess", exact: true }).click();
  await expect(
    page.getByText("1 attempts used", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("1 attempts used", { exact: true }),
  ).toBeVisible();
});
test("a solved practice game shows a win and can be replayed", async ({
  page,
}) => {
  await page.goto("/room/practice");
  await expect(page.getByText("SOLO PRACTICE", { exact: true })).toBeVisible();
  // Practice explicitly stores its secret locally; using it here verifies the
  // complete result flow without pretending this tests Arcium confidentiality.
  const code = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("nopeek-practice-v1")!)
        .solution as number[],
  );
  const names = ["Circle", "Diamond", "Triangle", "Square", "Star", "Cross"];
  for (const value of code)
    await page
      .getByRole("button", { name: `Choose ${names[value]}`, exact: true })
      .click();
  await page.getByRole("button", { name: "Submit guess", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "You had their number." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Another secret" }).click();
  await expect(
    page.getByRole("button", { name: "Submit guess", exact: true }),
  ).toBeDisabled();
});
test("practice makes its privacy limit explicit", async ({ page }) => {
  await page.goto("/room/practice");
  await page.getByRole("button", { name: "About practice mode" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "It is not cryptographically hidden.",
  );
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page
    .getByRole("button", { name: "How to play", exact: true })
    .press("Enter");
  await expect(page.getByRole("dialog")).toContainText("The dots are counts.");
});
test("join form rejects invalid invitations", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Join a room", exact: true }).click();
  await page.getByLabel("Room link or code").fill("bad!");
  await page
    .getByRole("button", { name: "Enter the room", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "valid room code",
  );
});
test("guide, pitch and responsive layout are usable", async ({ page }) => {
  for (const route of ["/", "/room/practice", "/how-it-works", "/pitch"]) {
    await page.goto(route);
    await expect(page.locator("h1").first()).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(overflow, `overflow on ${route}`).toBe(false);
  }
});
