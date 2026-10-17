# The Signal Brief

A responsive news dashboard and daily email composer. Built with React, TypeScript, Vite, and a small Node/Express RSS service.

## Run locally

Use Node **24.19.0** (`nvm use` when available) and npm.

```sh
npm ci
npm run dev
```

Vite serves the frontend on port **5173** and proxies `/api` to the RSS service on port **3001**. No API keys or database are required. For a production build:

```sh
npm run build
npm start
```

The Node server serves both the built frontend and the API on port 3001. `PORT` overrides the production/API port; keep it unset for the default development proxy. Production hosting needs a Node runtime, not static-only hosting. The service uses the host's HTTPS proxy through Node's `--use-env-proxy` option.

## What works

- Browse and search news, filter by topic/publication, and sort by date or topic.
- Save stories and build an email with selected articles.
- Edit the subject/opening note and preview the complete email.
- Copy plain text, download an `.eml` message, or open a short brief in your mail app. Long briefs download as a file because mail clients limit `mailto:` URLs.
- Keep bookmarks, selected stories, and edits in this browser's local storage.

There is no account system, recipient list, scheduler, or automatic email sending. Drafts are local to the browser/device and do not sync. Opening a mail app does not send a message.

## Sources and traceability

Sources are maintained in a single registry, `shared/sources.json`, shared by the feed service and the dashboard. Coverage focuses on SEO, paid media, marketing, and AI:

| Source                       | Coverage                                 | Integration                                                  |
| ---------------------------- | ---------------------------------------- | ------------------------------------------------------------ |
| Search Engine Land           | SEO and performance marketing            | Working main RSS feed; topic tags classify articles          |
| Google Ads & Commerce        | Official advertising updates             | RSS configured; publisher access still blocked in onboarding |
| Meta Newsroom                | Official advertising/business/AI updates | RSS configured with a relevance filter; access blocked       |
| OpenAI News                  | Official AI updates                      | RSS configured; access blocked                               |
| TechCrunch AI                | AI industry reporting                    | RSS configured; access blocked                               |
| Marketing Dive               | Marketing industry reporting             | RSS configured; access blocked                               |
| Search Engine Journal        | Search and marketing reporting           | RSS configured; access blocked                               |
| Microsoft Advertising        | Official ad-platform blog                | Website reference only                                       |
| LinkedIn Marketing Solutions | Official marketing blog                  | Website reference only                                       |
| TikTok for Business          | Official marketing blog                  | Website reference only                                       |

Website references are clearly labeled in the source directory. They provide direct official links, not automatically imported articles. No RSS feed is invented for a platform that does not have a verified endpoint. The configured replacement feeds remain unverified until network access is applied. Meta's general newsroom is filtered to advertising, business, commerce, and AI topics.

Search Engine Land's main feed was successfully fetched after publication. Its older category endpoints return HTTP 403, so they have been removed. General-interest news feeds are excluded. Previously saved stories from removed publishers are excluded from bookmarks and email drafts on startup.

Every displayed story retains the publisher's headline/summary, original HTTPS article URL, feed URL, publication date (when supplied), and retrieval timestamp. Article hosts must match the feed's publisher allowlist; invalid, insecure, and unrelated links are discarded. Tracking parameters are stripped, duplicate stories are merged, and specialized topics are preserved. Summaries are publisher-provided, **not AI-generated or independently fact-checked**. Original links and provenance are also included in email exports.

Feeds cache in memory for five minutes. Individual source failures do not suppress working sources. If refresh fails, cached stories are labeled stale; without a cache, the app shows an empty state. **There are no sample or invented news stories in the application.** The feed-status panel reports each configured feed's availability.

The published network policy now allows Search Engine Land, and live RSS retrieval has been checked. Original article-page requests still return HTTP 403 in this machine; their links are retained from the publisher feed, and full article contents have not been independently inspected. The newly added publishers still return proxy 403 errors. Their required domains are saved in the environment configuration draft. Preserve the package-manager network preset; review and save the new source-domain settings, then publish to apply them. A failed source remains visible in feed status and does not prevent working feeds from supplying stories.

## Validation

```sh
npm test
npm run build
npm run test:e2e
```

Unit tests cover RSS normalization, source-host enforcement, provenance, deduplication, source failure handling, and email header/content integrity. Browser tests cover desktop/mobile filtering, bookmarks, persisted drafts, email downloads with source links, failures, stale data, and damaged local storage. Browser tests use explicitly synthetic fixtures only inside the test suite; they do not prove connectivity to live publishers.

The Playwright config uses `/usr/bin/chromium` when present. To use another browser binary, set `CHROMIUM_PATH`. Otherwise install the Playwright browser with `npx playwright install chromium`; that download requires access to Playwright's browser distribution domains. The prepared cloud machine already has system Chromium.

## Cloud setup

Use the existing `/workspace/The-Signal-Brief` checkout. Each cloud task is already isolated; do not create a Git worktree unless explicitly requested. Run `npm ci`, `npm run build`, and `npm test`. Use `npm run dev` to start development services and check `/api/health` and `/api/briefs`. Live processes must restart in a new task; dependencies and built files can persist in the environment snapshot.
