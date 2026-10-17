import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

// Synthetic articles exist only in the test suite, never in the application.
const stories = [
  {
    id: "test-seo",
    title: "Test fixture: SEO measurement",
    summary: "A test-only publisher summary about search measurement.",
    topic: "SEO",
    source: "Search Engine Land",
    url: "https://searchengineland.com/test-fixture-seo",
    feedUrl: "https://searchengineland.com/library/seo/feed",
    publishedAt: "2026-10-17T10:00:00.000Z",
    retrievedAt: "2026-10-17T11:00:00.000Z",
  },
  {
    id: "test-ppc",
    title: "Test fixture: paid search planning",
    summary: "A test-only publisher summary about advertising.",
    topic: "Paid media",
    source: "Search Engine Land",
    url: "https://searchengineland.com/test-fixture-ppc",
    feedUrl: "https://searchengineland.com/library/ppc/feed",
    publishedAt: "2026-10-16T10:00:00.000Z",
    retrievedAt: "2026-10-17T11:00:00.000Z",
  },
  {
    id: "test-world",
    title: "Test fixture: world headline",
    summary: "A test-only world news summary.",
    topic: "World",
    source: "BBC News",
    url: "https://www.bbc.com/news/test-fixture",
    feedUrl: "https://feeds.bbci.co.uk/news/world/rss.xml",
    publishedAt: "2026-10-15T10:00:00.000Z",
    retrievedAt: "2026-10-17T11:00:00.000Z",
  },
];
const feed = {
  status: "live",
  updatedAt: "2026-10-17T11:00:00.000Z",
  stories,
  sources: [],
};
test.beforeEach(async ({ page }) => {
  await page.route("**/api/briefs", (route) => route.fulfill({ json: feed }));
});
test("filters by topic, text, and publication, and exposes traceable source details", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".story-card")).toHaveCount(3);
  await page
    .locator(".tabs")
    .getByRole("button", { name: "SEO", exact: true })
    .click();
  await expect(page.locator(".story-card")).toHaveCount(1);
  await page.getByText("View source details").click();
  await expect(
    page.getByRole("link", { name: "Original article" }),
  ).toHaveAttribute("href", stories[0].url);
  await expect(
    page.getByRole("link", { name: "Source RSS feed" }),
  ).toHaveAttribute("href", stories[0].feedUrl);
  await expect(
    page.getByText(
      "Publisher-provided summary; not independently fact-checked.",
    ),
  ).toBeVisible();
  await page
    .locator(".tabs")
    .getByRole("button", { name: "All stories", exact: true })
    .click();
  await page.getByLabel("Filter by publication").selectOption("BBC News");
  await expect(page.locator(".story-card")).toHaveCount(1);
  await page.getByLabel("Filter by publication").selectOption("All sources");
  await page
    .getByRole("textbox", { name: "Search stories" })
    .fill("advertising");
  await expect(page.locator(".story-card")).toHaveCount(1);
  await expect(page.locator(".story-card")).toContainText(
    "paid search planning",
  );
  await page.getByRole("button", { name: "Clear search" }).click();
  await expect(page.locator(".story-card")).toHaveCount(3);
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
});
test("bookmarks and an edited newsletter persist, and exported email retains provenance", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: `Save ${stories[0].title}`, exact: true })
    .click();
  await page
    .getByRole("button", {
      name: `Add ${stories[0].title} to email`,
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Compose daily email" }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Subject", { exact: true })
    .fill("My performance marketing brief");
  await dialog
    .getByLabel("Your opening note")
    .fill("Hello team, here is our daily perspective.");
  await expect(
    dialog.getByRole("link", { name: "Read at Search Engine Land" }),
  ).toHaveAttribute("href", stories[0].url);
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await dialog.getByRole("button", { name: "Copy text" }).click();
  await expect(dialog.getByRole("status")).toContainText("Brief copied");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    stories[0].url,
  );
  const downloadPromise = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Download email" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/signal-brief-.*\.eml/);
  const content = await readFile((await download.path())!, "utf8");
  expect(content).toContain(stories[0].url);
  expect(content).toContain(stories[0].feedUrl);
  expect(content).toContain("Hello team");
  await page.getByRole("button", { name: "Close email composer" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Saved stories" }).click();
  await expect(page.locator(".story-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Email composer" }).click();
  await expect(
    page.getByRole("dialog").getByLabel("Subject", { exact: true }),
  ).toHaveValue("My performance marketing brief");
  await expect(
    page.getByRole("dialog").getByLabel("Your opening note"),
  ).toHaveValue("Hello team, here is our daily perspective.");
  await page
    .getByRole("button", { name: `Remove ${stories[0].title} from preview` })
    .click();
  await expect(
    page.getByRole("dialog").getByRole("button", { name: "Download email" }),
  ).toBeDisabled();
});
test("unavailable feeds show an honest empty state with no invented stories", async ({
  page,
}) => {
  await page.route("**/api/briefs", (route) =>
    route.fulfill({ json: { ...feed, status: "unavailable", stories: [] } }),
  );
  await page.goto("/");
  await expect(
    page.getByText("Good information starts at the source."),
  ).toBeVisible();
  await expect(page.locator(".story-card")).toHaveCount(0);
  await page.getByRole("button", { name: "Compose daily email" }).click();
  await expect(
    page.getByRole("dialog").getByRole("button", { name: "Download email" }),
  ).toBeDisabled();
});
test("failed requests can be retried and stale content is labeled", async ({
  page,
}) => {
  await page.route("**/api/briefs", (route) =>
    route.fulfill({ status: 503, json: { error: "Unavailable" } }),
  );
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText(
    "Could not load your stories",
  );
  await page.route("**/api/briefs", (route) =>
    route.fulfill({ json: { ...feed, status: "stale" } }),
  );
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.locator(".story-card")).toHaveCount(3);
  await expect(page.getByText("Last available headlines")).toBeVisible();
  await expect(page.getByText(/Showing headlines from/)).toBeVisible();
});
test("corrupted browser storage does not break startup", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("signal-saved", "{}");
    localStorage.setItem("signal-draft", "{broken");
    localStorage.setItem("signal-draft-stories", '[{"title":"Incomplete"}]');
  });
  await page.goto("/");
  await expect(page.locator(".story-card")).toHaveCount(3);
  await page.getByRole("button", { name: "Compose daily email" }).click();
  await expect(
    page.getByRole("dialog").getByRole("button", { name: "Download email" }),
  ).toBeDisabled();
});
