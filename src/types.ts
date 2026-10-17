export type Topic =
  | "SEO"
  | "Paid media"
  | "Marketing"
  | "World"
  | "Business"
  | "Technology"
  | "Science";
export type Story = {
  id: string;
  title: string;
  summary: string;
  topic: Topic;
  source: string;
  url: string;
  feedUrl: string;
  retrievedAt: string;
  publishedAt: string | null;
};
export type FeedSource = {
  source: string;
  topic: Topic;
  feedUrl: string;
  available: boolean;
};
export type BriefResponse = {
  status: "live" | "stale" | "unavailable";
  updatedAt: string | null;
  stories: Story[];
  sources: FeedSource[];
};
