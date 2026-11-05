import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const offer = {
  purpose: "Email creator outreach",
  problem: "Follow-up work",
  capabilities: ["Personalized follow-ups"],
  integrations: ["Gmail"],
  pricing: "₹1,000/month",
  limitations: ["No influencer discovery"],
  customers: "Brands with creator programmes",
  location: "Pune, India",
  countries: ["India", "UK"],
  languages: ["English"],
  industry: "Retail",
  businessSize: "Small business",
  scope: "both",
};
const id = "00000000-0000-4000-8000-000000000010";
const prospect = {
  id,
  domain: "fixture.example",
  name: "Fixture Brand",
  url: "https://fixture.example",
  industry: "Retail",
  location: "Pune, India",
  score: 82,
  status: "new",
  checkedAt: "2026-11-03T00:00:00.000Z",
  factors: ["Relevant creator activity"],
  sources: [
    {
      url: "https://fixture.example",
      title: "Fixture Brand",
      text: "Fixture Brand invites creator collaborations.",
      fetchedAt: "2026-11-03T00:00:00.000Z",
      kind: "page",
      links: [],
    },
  ],
  assessment: {
    observations: [
      {
        quote: "Fixture Brand invites creator collaborations.",
        sourceUrl: "https://fixture.example",
      },
    ],
    inferences: ["Outreach may be relevant."],
    unknowns: ["Existing software is unknown."],
    mismatches: [],
    skipReasons: [],
    question: "How do you manage creator follow-ups?",
    explanation:
      "Public creator activity suggests plausible fit; need is unknown.",
    industry: "Retail",
    location: "Pune, India",
    businessType: "Brand",
    integrations: ["Gmail"],
    fit: 4,
    serviceable: true,
    contacts: [],
    people: [],
  },
};
test("landing and onboarding are accessible and mobile responsive", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Find a reason",
  );
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.getByRole("link", { name: "Talk", exact: true }).click();
  await expect(page.getByLabel("Your offer")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});
test("text offer is edited and confirmed before research; quota message is explicit", async ({
  page,
}) => {
  await page.route("**/api/offers", async (route) => {
    const body = route.request().postDataJSON();
    await route.fulfill({
      json:
        body.action === "understand"
          ? { profile: offer, questions: ["Does it manage replies?"] }
          : { id, profile: offer },
    });
  });
  await page.route("**/api/research", (route) =>
    route.fulfill({
      status: 429,
      json: {
        error: "Your daily batch limit has been reached.",
        code: "QUOTA",
      },
    }),
  );
  await page.goto("/workspace");
  await page
    .getByLabel("Your offer")
    .fill(
      "I built personalized influencer email follow-up automation for brands.",
    );
  await page.getByRole("button", { name: /Review offer/ }).click();
  await expect(page.getByText("Does it manage replies?")).toBeVisible();
  await page.getByRole("button", { name: /Looks right/ }).click();
  await expect(page).toHaveURL(/research\?offer=/);
  await page.getByRole("button", { name: "Find prospects" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "daily batch limit" }),
  ).toBeVisible();
});
test("board shows provenance, saves, exports, dismisses and prevents script execution", async ({
  page,
}) => {
  await page.route("**/api/prospects*", (route) =>
    route.fulfill({
      json:
        route.request().method() === "GET"
          ? {
              prospects: [
                { ...prospect, name: "<script>window.pwned=true</script>" },
              ],
              offerId: id,
            }
          : route.request().postDataJSON().action === "export"
            ? {
                csv: '\uFEFF"Business"\r\n"Fixture Brand"',
                filename: "spectra-shortlist-2026-11-03.csv",
              }
            : { ok: true },
    }),
  );
  await page.goto(`/prospects?search=${id}`);
  await expect(
    page.getByText("<script>window.pwned=true</script>").first(),
  ).toBeVisible();
  expect(await page.evaluate(() => Object.hasOwn(window, "pwned"))).toBe(false);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("button", { name: "Saved" })).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /Export CSV/ }).click();
  expect((await download).suggestedFilename()).toBe(
    "spectra-shortlist-2026-11-03.csv",
  );
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.getByRole("button", { name: "Skip", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "No matching prospects." }),
  ).toBeVisible();
});
test("auth, IDOR and forged mutation attempts fail closed in setup mode", async ({
  request,
}) => {
  for (const path of [
    "/api/account",
    "/api/prospects?search=" + id,
    "/api/research?id=" + id,
  ]) {
    const response = await request.get(path);
    expect(response.status()).toBe(503);
    expect(await response.text()).not.toContain("SERVICE_ROLE");
  }
  const response = await request.post("/api/offers", {
    data: { action: "confirm", profile: offer },
    headers: { origin: "https://attacker.example" },
  });
  expect(response.status()).toBe(403);
  const cron = await request.get("/api/cron");
  expect(cron.status()).toBe(401);
});
test("security headers contain nonce CSP and no unsafe directives", async ({
  request,
}) => {
  const a = await request.get("/"),
    b = await request.get("/");
  const csp = a.headers()["content-security-policy"];
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).not.toMatch(/unsafe-inline|unsafe-eval/);
  expect(csp).not.toBe(b.headers()["content-security-policy"]);
  expect(a.headers()["x-content-type-options"]).toBe("nosniff");
});

test("voice recording yields an editable transcript and stops its microphone", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["microphone"]);
  let submitted = false;
  await page.route("**/api/voice", async (route) => {
    const body = route.request().postDataJSON();
    expect(body.action).toBe("transcribe");
    expect(Buffer.from(body.base64, "base64").subarray(0, 4).toString()).toBe(
      "RIFF",
    );
    submitted = true;
    await route.fulfill({ json: { text: "I built a creator outreach tool." } });
  });
  await page.goto("/workspace");
  await page
    .getByRole("button", { name: "Start recording, up to 20 seconds" })
    .click();
  await expect(
    page.getByRole("button", { name: "Stop recording" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Stop recording" }).click();
  await expect(page.getByLabel("Your offer")).toHaveValue(
    "I built a creator outreach tool.",
  );
  expect(submitted).toBe(true);
  await page.getByLabel("Your offer").fill("Edited before submitting");
  await expect(page.getByLabel("Your offer")).toHaveValue(
    "Edited before submitting",
  );
  await expect(
    page.getByRole("button", { name: "Start recording, up to 20 seconds" }),
  ).toHaveAttribute("aria-pressed", "false");
});

test("session reaches results, discusses the first prospect and stops speech", async ({
  page,
}) => {
  await page.route("**/api/offers", (route) =>
    route.fulfill({
      json:
        route.request().postDataJSON().action === "understand"
          ? { profile: offer, questions: [] }
          : { id, profile: offer },
    }),
  );
  await page.route("**/api/research*", (route) =>
    route.fulfill({
      json:
        route.request().method() === "POST"
          ? { id }
          : {
              searches: [
                { id, status: "completed", stage: 4, data: {}, offer_id: id },
              ],
              stages: [],
            },
    }),
  );
  await page.route("**/api/prospects*", (route) =>
    route.fulfill({ json: { prospects: [prospect], offerId: id } }),
  );
  await page.route("**/api/conversation", (route) => {
    const body = route.request().postDataJSON();
    expect(body.displayedIds).toEqual([id]);
    expect(body.text).toBe("What about the first one?");
    return route.fulfill({
      json: {
        conversationId: id,
        answer:
          "Creator collaborations are listed. Existing software is unknown.",
        focusIds: [id],
        action: "answer",
      },
    });
  });
  await page.addInitScript(() => {
    Object.assign(window, { speechPlays: 0, speechPauses: 0 });
    HTMLMediaElement.prototype.play = async function () {
      Object.assign(window, {
        speechPlays: Reflect.get(window, "speechPlays") + 1,
      });
    };
    HTMLMediaElement.prototype.pause = function () {
      Object.assign(window, {
        speechPauses: Reflect.get(window, "speechPauses") + 1,
      });
    };
  });
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let speechRequests = 0;
  await page.route("**/api/voice", async (route) => {
    expect(route.request().postDataJSON().action).toBe("speak");
    speechRequests++;
    if (speechRequests === 2) await gate;
    await route.fulfill({ json: { base64: "UklGRg==" } });
  });
  await page.goto("/workspace");
  await page
    .getByLabel("Your offer")
    .fill("I build creator follow-up tools for small brands.");
  await page.getByRole("button", { name: "Review offer", exact: true }).click();
  await expect(page.getByRole("button", { name: "Looks right" })).toBeVisible();
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.screenshot({
      path: test.info().outputPath(`confirmation-${width}.png`),
      fullPage: true,
    });
  }
  await page.getByRole("button", { name: "Looks right" }).click();
  await page.getByRole("button", { name: "Find prospects" }).click();
  await page.getByRole("link", { name: "View prospects", exact: true }).click();
  await expect(page.locator(".prospect-row")).toHaveCount(1);
  await page
    .getByLabel("Question", { exact: true })
    .fill("What about the first one?");
  await page.getByRole("button", { name: "Ask", exact: true }).click();
  const chat = page.locator(".chat");
  await expect(
    chat.getByText(
      "Creator collaborations are listed. Existing software is unknown.",
    ),
  ).toBeVisible();
  await expect(page.locator(".focus-card")).toContainText("Fixture Brand");
  await chat.getByRole("button", { name: "Listen", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => Reflect.get(window, "speechPlays")))
    .toBe(1);
  await chat.getByRole("button", { name: "Stop speaking" }).click();
  expect(await page.evaluate(() => Reflect.get(window, "speechPauses"))).toBe(
    1,
  );
  await chat.getByRole("button", { name: "Listen", exact: true }).click();
  await expect.poll(() => speechRequests).toBe(2);
  await chat.getByRole("button", { name: "Stop speaking" }).click();
  release();
  await expect(
    chat.getByRole("button", { name: "Listen", exact: true }),
  ).toBeEnabled();
  await page.waitForLoadState("networkidle");
  expect(await page.evaluate(() => Reflect.get(window, "speechPlays"))).toBe(1);
});

for (const width of [360, 390, 768, 1024, 1280, 1536]) {
  test(`screens fit ${width}px with accessible desktop and mobile states`, async ({
    page,
  }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.route("**/api/prospects*", (route) =>
      route.fulfill({
        json: {
          prospects: [
            prospect,
            {
              ...prospect,
              id: "00000000-0000-4000-8000-000000000011",
              name: "Second Fixture",
            },
          ],
          offerId: id,
        },
      }),
    );
    await page.route("**/api/research*", (route) =>
      route.fulfill({
        json: {
          searches: [
            {
              id,
              status: "completed",
              stage: 4,
              created_at: "2026-11-03T00:00:00.000Z",
              data: { offer },
              offer_id: id,
            },
          ],
          stages: [
            { stage: 0, status: "completed", item_key: "fixture", attempts: 1 },
          ],
        },
      }),
    );
    await page.route("**/api/account", (route) =>
      route.fulfill({
        json: {
          usage: [{ feature: "research", day: "2026-11-03", amount: 2 }],
          factors: [],
        },
      }),
    );
    const screens = [
      { name: "landing", url: "/" },
      { name: "session", url: "/workspace" },
      { name: "research", url: `/research?id=${id}` },
      { name: "prospects", url: `/prospects?search=${id}` },
      { name: "history", url: "/history" },
      { name: "settings", url: "/settings" },
      { name: "signin", url: "/login" },
      { name: "privacy", url: "/privacy" },
      { name: "terms", url: "/terms" },
      { name: "not-found", url: "/missing-page" },
    ];
    for (const screen of screens) {
      await page.goto(screen.url);
      if (screen.name === "prospects")
        await expect(page.locator(".prospect-row")).toHaveCount(2);
      if (screen.name === "research")
        await expect(
          page.getByRole("link", { name: "View prospects", exact: true }),
        ).toBeVisible();
      if (screen.name === "history")
        await expect(
          page.getByRole("link", { name: "View prospects", exact: true }),
        ).toBeVisible();
      if (screen.name === "settings") {
        await page
          .getByRole("button", { name: "Load usage & security" })
          .click();
        await expect(page.getByRole("progressbar")).toHaveAttribute(
          "value",
          "2",
        );
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
        screen.name,
      ).toBe(true);
      if (width === 390 || width === 1280) {
        expect(
          (
            await new AxeBuilder({ page })
              .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
              .analyze()
          ).violations,
          screen.name,
        ).toEqual([]);
        await page.screenshot({
          path: test.info().outputPath(`${screen.name}-${width}.png`),
          fullPage: true,
        });
      }
      if (screen.name === "settings" && (width === 390 || width === 1280)) {
        await page.getByRole("button", { name: "Light", exact: true }).click();
        expect(
          (
            await new AxeBuilder({ page })
              .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
              .analyze()
          ).violations,
        ).toEqual([]);
        await page.screenshot({
          path: test.info().outputPath(`settings-light-${width}.png`),
          fullPage: true,
        });
      }
    }
    await page.goto("/design");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "This page isn’t here.",
    );
  });
}
