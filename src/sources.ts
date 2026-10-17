import registry from "../shared/sources.json";
import type { Story } from "./types";

export const sources = registry;
export function sourceLabel(name: string) {
  const kind = sources.find((s) => s.source === name)?.kind;
  return kind === "platform"
    ? "Official platform"
    : kind === "ai"
      ? "Official AI news"
      : "Industry publication";
}
export function isAllowedStory(value: unknown): value is Story {
  if (!value || typeof value !== "object") return false;
  const s = value as Partial<Story>;
  if (
    typeof s.id !== "string" ||
    typeof s.title !== "string" ||
    typeof s.summary !== "string" ||
    typeof s.source !== "string" ||
    !["SEO", "Paid media", "Marketing", "AI"].includes(s.topic || "") ||
    typeof s.url !== "string" ||
    typeof s.feedUrl !== "string" ||
    typeof s.retrievedAt !== "string" ||
    !Number.isFinite(Date.parse(s.retrievedAt))
  )
    return false;
  const spec = sources.find(
    (source) => source.source === s.source && source.url,
  );
  if (!spec) return false;
  try {
    const article = new URL(s.url);
    const feed = new URL(s.feedUrl);
    return [article, feed].every(
      (url) =>
        url.protocol === "https:" &&
        spec.hosts.includes(url.hostname) &&
        !url.username &&
        !url.password,
    );
  } catch {
    return false;
  }
}
