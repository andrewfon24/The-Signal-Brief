import type { Story } from "./types";

export function emailText(subject: string, intro: string, stories: Story[]) {
  return [
    subject,
    "",
    intro,
    ...stories.flatMap((story, i) => [
      "",
      `${i + 1}. ${story.title}`,
      `${story.topic} · ${story.source}`,
      story.summary,
      story.url,
      ...(story.publishedAt
        ? [`Published: ${new Date(story.publishedAt).toLocaleString()}`]
        : []),
      `Feed: ${story.feedUrl}`,
      `Retrieved: ${new Date(story.retrievedAt).toLocaleString()}`,
    ]),
    "",
    "Curated with The Signal Brief.",
  ].join("\n");
}
export function emailFile(subject: string, body: string) {
  const cleanSubject = subject.replace(/[\r\n]/g, " ");
  const encodedSubject = `=?UTF-8?B?${btoa(String.fromCharCode(...new TextEncoder().encode(cleanSubject)))}?=`;
  return `Subject: ${encodedSubject}\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n${body.replace(/\r?\n/g, "\r\n")}`;
}
