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

**Search Engine Land** provides SEO, paid search, and performance marketing coverage. **BBC News** provides wider business, technology, world, and science headlines. Configured RSS endpoints are declared in `server/feeds.mjs`:

- `https://searchengineland.com/feed`
- `https://searchengineland.com/library/seo/feed`
- `https://searchengineland.com/library/ppc/feed`
- `https://feeds.bbci.co.uk/news/{world,business,technology,science_and_environment}/rss.xml`

Every displayed story retains the publisher's headline/summary, original HTTPS article URL, feed URL, publication date (when supplied), and retrieval timestamp. Article hosts must match the feed's publisher allowlist; invalid, insecure, and unrelated links are discarded. Tracking parameters are stripped, duplicate stories are merged, and specialized topics are preserved. Summaries are publisher-provided, **not AI-generated or independently fact-checked**. Original links and provenance are also included in email exports.

Feeds cache in memory for five minutes. Individual source failures do not suppress working sources. If refresh fails, cached stories are labeled stale; without a cache, the app shows an empty state. **There are no sample or invented news stories in the application.** The feed-status panel reports each configured feed's availability.

The onboarding machine currently rejects outbound requests to the publisher feeds with a proxy `403`. Their URLs are configured but current feed/article contents have **not** been verified from this machine. Enable `feeds.bbci.co.uk`, `searchengineland.com`, and `www.searchengineland.com` in the environment's network settings, then refresh. These domain requirements have been saved in the environment configuration draft.

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
