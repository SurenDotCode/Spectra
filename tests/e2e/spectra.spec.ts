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
    "Your next client",
  );
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.getByRole("link", { name: /Describe what you built/ }).click();
  await expect(page.getByLabel("What did you build?")).toBeVisible();
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
    .getByLabel("What did you build?")
    .fill(
      "I built personalized influencer email follow-up automation for brands.",
    );
  await page.getByRole("button", { name: /Build my offer/ }).click();
  await expect(page.getByText("Does it manage replies?")).toBeVisible();
  await page.getByRole("button", { name: /Confirm profile/ }).click();
  await expect(page).toHaveURL(/research\?offer=/);
  await page.getByRole("button", { name: /Start real research/ }).click();
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
  await page.getByRole("button", { name: "＋ Shortlist" }).click();
  await expect(
    page.getByRole("button", { name: "✓ Shortlisted" }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /Export shortlist/ }).click();
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
  await page.getByRole("button", { name: "Dismiss", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "No matching prospects yet." }),
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
  await expect(page.getByLabel("What did you build?")).toHaveValue(
    "I built a creator outreach tool.",
  );
  expect(submitted).toBe(true);
  await page.getByLabel("What did you build?").fill("Edited before submitting");
  await expect(page.getByLabel("What did you build?")).toHaveValue(
    "Edited before submitting",
  );
  await expect(
    page.getByRole("button", { name: "Start recording, up to 20 seconds" }),
  ).toHaveAttribute("aria-pressed", "false");
});
