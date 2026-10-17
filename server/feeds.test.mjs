import test from "node:test";
import assert from "node:assert/strict";
import { feeds, normalizeItem, fetchStories, plainText } from "./feeds.mjs";
import { emailFile, emailText } from "../src/email.ts";

const spec = feeds[0];
const item = {
  title: "Test SEO headline",
  link: "https://searchengineland.com/test-fixture?utm_source=rss#top",
  content: "<p>A source-provided <b>summary</b>.</p>",
  pubDate: "Fri, 16 Oct 2026 12:00:00 GMT",
};
test("preserves source provenance, publication time, and plain source text", () => {
  const story = normalizeItem(item, spec, "2026-10-17T12:00:00.000Z");
  assert.equal(story.url, "https://searchengineland.com/test-fixture");
  assert.equal(story.feedUrl, spec.url);
  assert.equal(story.source, "Search Engine Land");
  assert.equal(story.summary, "A source-provided summary.");
  assert.equal(story.publishedAt, "2026-10-16T12:00:00.000Z");
  assert.equal(story.retrievedAt, "2026-10-17T12:00:00.000Z");
  assert.equal(
    story.id,
    normalizeItem(
      { ...item, link: "https://searchengineland.com/test-fixture" },
      spec,
    ).id,
  );
});
test("rejects non-source domains, insecure URLs, embedded credentials, missing titles, and executable links", () => {
  for (const link of [
    "https://unrelated.example/story",
    "https://searchengineland.com.evil.example/story",
    "http://searchengineland.com/story",
    "javascript:alert(1)",
    "https://user:pass@searchengineland.com/story",
    "not a url",
  ])
    assert.equal(normalizeItem({ ...item, link }, spec), null);
  assert.equal(normalizeItem({ ...item, title: "" }, spec), null);
  assert.equal(
    normalizeItem({ ...item, pubDate: "invalid" }, spec).publishedAt,
    null,
  );
  assert.equal(plainText("<p>Search &amp; media</p>"), "Search & media");
});
test("parses actual RSS structure, deduplicates cross-posts, and retains specialist topic", async () => {
  const xml =
    '<?xml version="1.0"?><rss version="2.0"><channel><title>Test fixture only</title><item><title>Test SEO headline</title><link>https://searchengineland.com/test-fixture</link><description><![CDATA[<p>Source text.</p>]]></description><pubDate>Fri, 16 Oct 2026 12:00:00 GMT</pubDate></item></channel></rss>';
  const result = await fetchStories(
    async (url) =>
      new Response(xml, {
        status: url.includes("searchengineland.com") ? 200 : 503,
      }),
  );
  assert.equal(result.stories.length, 1);
  assert.equal(result.stories[0].topic, "SEO");
  assert.equal(result.stories[0].summary, "Source text.");
  assert.equal(result.sources.filter((s) => s.available).length, 3);
  assert.equal(result.sources.filter((s) => !s.available).length, 4);
});
test("unavailable or invalid feeds produce no invented stories", async () => {
  for (const fetcher of [
    async () => {
      throw new Error("Network unavailable");
    },
    async () => new Response("not XML"),
  ]) {
    const result = await fetchStories(fetcher);
    assert.equal(result.stories.length, 0);
    assert.ok(result.sources.every((s) => !s.available));
  }
});
test("classifies performance marketing categories in the general Search Engine Land feed", () => {
  const general = feeds.find((feed) => feed.topic === "Marketing");
  assert.equal(
    normalizeItem({ ...item, categories: ["PPC", "Google Ads"] }, general)
      .topic,
    "Paid media",
  );
  assert.equal(
    normalizeItem({ ...item, categories: ["SEO"] }, general).topic,
    "SEO",
  );
  assert.equal(
    normalizeItem({ ...item, categories: ["Industry"] }, general).topic,
    "Marketing",
  );
});
test("email includes direct article and feed links, dates, and safely encoded headers", () => {
  const story = normalizeItem(item, spec);
  const body = emailText("Daily brief", "Hello readers,", [story]);
  for (const text of [
    story.url,
    story.feedUrl,
    story.source,
    "Published:",
    "Retrieved:",
  ])
    assert.ok(body.includes(text));
  const eml = emailFile("Daily brief\r\nBcc: injected@example.com", body);
  assert.ok(eml.startsWith("Subject: =?UTF-8?B?"));
  assert.ok(!eml.includes("\r\nBcc:"));
  assert.ok(eml.includes("Content-Type: text/plain; charset=UTF-8"));
  assert.ok(eml.includes(story.url));
});
