import Parser from "rss-parser";
import { createHash } from "node:crypto";

import sourceRegistry from "../shared/sources.json" with { type: "json" };

export const feeds = sourceRegistry.filter((source) => source.url);
const parser = new Parser();
export function plainText(value = "") {
  return String(value)
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}
export function normalizeItem(
  item,
  feed,
  retrievedAt = new Date().toISOString(),
) {
  let url;
  try {
    url = new URL(item.link);
  } catch {
    return null;
  }
  if (
    url.protocol !== "https:" ||
    !feed.hosts.includes(url.hostname) ||
    url.username ||
    url.password
  )
    return null;
  url.hash = "";
  for (const key of [...url.searchParams.keys()])
    if (key.startsWith("utm_") || key === "fbclid" || key === "gclid")
      url.searchParams.delete(key);
  const title = plainText(item.title);
  if (!title) return null;
  const date = new Date(item.isoDate || item.pubDate || "");
  const categories = (
    Array.isArray(item.categories) ? item.categories : []
  ).join(" ");
  const summary = plainText(item.contentSnippet || item.content || "").slice(
    0,
    700,
  );
  if (
    feed.relevance &&
    !new RegExp(feed.relevance, "i").test(`${title} ${summary} ${categories}`)
  )
    return null;
  const topic =
    feed.topic === "Marketing"
      ? /\b(ppc|paid search|paid media|paid social|google ads|microsoft advertising)\b/i.test(
          categories,
        )
        ? "Paid media"
        : /\b(seo|organic search|search engine optimization)\b/i.test(
              categories,
            )
          ? "SEO"
          : feed.topic
      : feed.topic;
  return {
    id: createHash("sha256").update(url.href).digest("hex").slice(0, 20),
    title,
    summary,
    topic,
    source: feed.source,
    url: url.href,
    feedUrl: feed.url,
    retrievedAt,
    publishedAt: Number.isNaN(date.getTime()) ? null : date.toISOString(),
  };
}
export async function fetchStories(fetcher = fetch) {
  const results = await Promise.allSettled(
    feeds.map(async (spec) => {
      const response = await fetcher(spec.url, {
        signal: AbortSignal.timeout(10000),
        headers: { "User-Agent": "TheSignalBrief/0.1 RSS reader" },
      });
      if (!response.ok) throw new Error(`Feed HTTP ${response.status}`);
      const feed = await parser.parseString(await response.text());
      return feed.items
        .slice(0, 12)
        .map((item) => normalizeItem(item, spec))
        .filter(Boolean);
    }),
  );
  const stories = results.flatMap((result) =>
    result.status === "fulfilled" ? result.value : [],
  );
  const byId = new Map();
  for (const story of stories)
    if (!byId.has(story.id)) byId.set(story.id, story);
  const unique = [...byId.values()];
  unique.sort((a, b) =>
    (b.publishedAt || "").localeCompare(a.publishedAt || ""),
  );
  return {
    stories: unique,
    sources: feeds.map((feed, i) => ({
      source: feed.source,
      topic: feed.topic,
      feedUrl: feed.url,
      available: results[i].status === "fulfilled",
      storyCount:
        results[i].status === "fulfilled" ? results[i].value.length : 0,
      error:
        results[i].status === "fulfilled"
          ? null
          : /^Feed HTTP \d{3}$/.test(results[i].reason?.message || "")
            ? results[i].reason.message
            : "Feed could not be retrieved or parsed",
    })),
  };
}
