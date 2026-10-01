import { test, expect } from "@playwright/test";
import { scoreGuess } from "../../src/lib/game";

test("two players finish an actual encrypted Solana/Arcium round", async ({
  browser,
}, info) => {
  test.skip(
    process.env.RUN_CHAIN_E2E !== "1" || info.project.name !== "desktop",
    "Requires a running, funded Arcium deployment",
  );
  test.setTimeout(240000);
  const hostContext = await browser.newContext(
      process.env.RECORD_DEMO === "1"
        ? {
            viewport: { width: 1280, height: 900 },
            recordVideo: {
              dir: ".demo-recording",
              size: { width: 1280, height: 900 },
            },
          }
        : {},
    ),
    guestContext = await browser.newContext();
  const host = await hostContext.newPage(),
    guest = await guestContext.newPage();
  const base = process.env.TEST_BASE_URL ?? "http://localhost:3033";
  await host.goto(base);
  await host.screenshot({ path: "docs/home.png", fullPage: true });
  await host
    .getByRole("button", { name: "Create a room", exact: true })
    .click();
  await host.getByLabel("Room name").fill("Thursday night suspects");
  await host
    .getByRole("button", { name: "Create encrypted room", exact: true })
    .click();
  await expect(host).toHaveURL(/\/room\/[a-z0-9]+$/, { timeout: 30000 });
  await expect(
    host.getByRole("button", { name: "Start the race" }),
  ).toBeVisible({ timeout: 60000 });
  await guest.goto(host.url());
  await guest.getByLabel("Your nickname").fill("The usual suspect");
  await guest
    .getByRole("button", { name: "Join the room", exact: true })
    .click();
  await expect(
    host.getByText("The usual suspect", { exact: true }),
  ).toBeVisible({ timeout: 30000 });
  await host.getByRole("button", { name: "Start the race" }).click();
  await expect(
    guest.getByRole("button", { name: "Choose Circle", exact: true }),
  ).toBeEnabled({ timeout: 30000 });
  await host.getByRole("button", { name: "Inspect the sealed secret" }).click();
  await expect(host.getByRole("dialog")).toContainText(
    /Arcium MPC on Solana (devnet|localnet)/,
  );
  await expect(
    host.getByRole("dialog").locator(".ciphertext span"),
  ).toHaveCount(5);
  await host.screenshot({
    path: "docs/encrypted-inspection.png",
    fullPage: true,
  });
  await host.getByRole("button", { name: "Close dialog" }).click();
  const roomId = new URL(host.url()).pathname.split("/").pop()!;
  const names = ["Circle", "Diamond", "Triangle", "Square", "Star", "Cross"];
  let possible = Array.from({ length: 6 ** 5 }, (_, n) =>
    Array.from({ length: 5 }, () => {
      const value = n % 6;
      n = Math.floor(n / 6);
      return value;
    }),
  );
  let guess = [0, 0, 1, 1, 2];
  for (let index = 0; index < 10; index++) {
    for (const value of guess)
      await host
        .getByRole("button", { name: `Choose ${names[value]}`, exact: true })
        .click();
    await host
      .getByRole("button", { name: "Submit guess", exact: true })
      .click();
    let feedback: { exact: number; misplaced: number } | undefined;
    await expect
      .poll(
        async () => {
          const response = await host.request.get(`${base}/api/room/${roomId}`);
          const room = await response.json();
          const result = room.players?.[0]?.guesses[index];
          if (result && !result.pending && !result.failed) feedback = result;
          return !!feedback;
        },
        { timeout: 60000, intervals: [1000, 3000] },
      )
      .toBe(true);
    possible = possible.filter((code) => {
      const result = scoreGuess(code, guess);
      return (
        result.exact === feedback!.exact &&
        result.misplaced === feedback!.misplaced
      );
    });
    expect(possible.length).toBeGreaterThan(0);
    if (feedback!.exact === 5) break;
    if (index === 0) {
      // Replay one known non-winning guess as the second player. Identical
      // feedback confirms that both independent identities query one secret.
      for (const value of guess)
        await guest
          .getByRole("button", { name: `Choose ${names[value]}`, exact: true })
          .click();
      await guest
        .getByRole("button", { name: "Submit guess", exact: true })
        .click();
      await expect
        .poll(
          async () => {
            const response = await guest.request.get(
              `${base}/api/room/${roomId}`,
            );
            const current = await response.json();
            const clue = current.players?.[1]?.guesses[0];
            if (!clue || clue.pending) return false;
            expect(clue.failed).toBe(false);
            expect(clue.exact).toBe(feedback!.exact);
            expect(clue.misplaced).toBe(feedback!.misplaced);
            return true;
          },
          { timeout: 60000, intervals: [1000, 3000] },
        )
        .toBe(true);
    }
    guess = possible[0];
    await expect(
      host.getByRole("button", { name: "Choose Circle", exact: true }),
    ).toBeEnabled({ timeout: 10000 });
  }
  await expect(
    host.getByRole("heading", { name: "You had their number." }),
  ).toBeVisible({ timeout: 15000 });
  await expect(
    guest.getByRole("heading", { name: "Host cracked it first." }),
  ).toBeVisible({ timeout: 15000 });
  await host.screenshot({
    path: "docs/multiplayer-verified.png",
    fullPage: true,
  });
  await guest.screenshot({
    path: "docs/multiplayer-guest-verified.png",
    fullPage: true,
  });
  await hostContext.close();
  await guestContext.close();
  if (process.env.RECORD_DEMO === "1")
    await host.video()?.saveAs("public/nopeek-demo.webm");
});
