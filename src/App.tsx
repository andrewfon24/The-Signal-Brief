import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Check,
  CheckCheck,
  ChevronRight,
  CircleHelp,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Globe2,
  LayoutGrid,
  LoaderCircle,
  Mail,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Send,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import type { BriefResponse, Story, Topic } from "./types";
import { emailFile, emailText } from "./email";

type Draft = { stories: Story[]; subject: string; intro: string };
const today = new Intl.DateTimeFormat("en", {
  weekday: "long",
  month: "long",
  day: "numeric",
}).format(new Date());
const defaultDraft: Draft = {
  stories: [],
  subject: `The Signal Brief — ${today}`,
  intro:
    "Good morning,\n\nHere are the stories worth your attention today. A little less noise, a little more perspective.",
};
function stored<T>(key: string, fallback: T): T {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    return value ?? fallback;
  } catch {
    return fallback;
  }
}
function loadStories(key: string) {
  const value = stored<unknown>(key, []);
  return Array.isArray(value)
    ? value.filter(
        (s): s is Story =>
          s &&
          typeof s.id === "string" &&
          typeof s.title === "string" &&
          typeof s.topic === "string" &&
          typeof s.summary === "string" &&
          typeof s.source === "string" &&
          typeof s.url === "string" &&
          /^https:\/\//.test(s.url) &&
          typeof s.feedUrl === "string" &&
          typeof s.retrievedAt === "string" &&
          ["Search Engine Land", "BBC News"].includes(s.source),
      )
    : [];
}
function loadDraft(): Draft {
  const value = stored<Partial<Draft>>("signal-draft", {});
  return {
    stories: loadStories("signal-draft-stories"),
    subject:
      typeof value.subject === "string" ? value.subject : defaultDraft.subject,
    intro: typeof value.intro === "string" ? value.intro : defaultDraft.intro,
  };
}
const topics: Array<"All stories" | Topic> = [
  "All stories",
  "SEO",
  "Paid media",
  "Marketing",
  "World",
  "Business",
  "Technology",
  "Science",
];
const readTime = (stories: Story[]) =>
  Math.max(
    1,
    Math.ceil(
      stories.reduce(
        (total, s) => total + (s.title + " " + s.summary).split(/\s+/).length,
        0,
      ) / 200,
    ),
  );

export default function App() {
  const [feed, setFeed] = useState<BriefResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [topic, setTopic] = useState("All stories");
  const [view, setView] = useState<"today" | "saved">("today");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("latest");
  const [source, setSource] = useState("All sources");
  const [saved, setSaved] = useState<Story[]>(() =>
    loadStories("signal-saved"),
  );
  const [draft, setDraft] = useState<Draft>(loadDraft);
  const [composing, setComposing] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [notice, setNotice] = useState("");
  const [limit, setLimit] = useState(9);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const aboutRef = useRef<HTMLDialogElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    void refresh();
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("signal-saved", JSON.stringify(saved));
      localStorage.setItem(
        "signal-draft",
        JSON.stringify({ subject: draft.subject, intro: draft.intro }),
      );
      localStorage.setItem(
        "signal-draft-stories",
        JSON.stringify(draft.stories),
      );
    } catch {
      setNotice(
        "Browser storage is unavailable. Keep this tab open to retain your draft.",
      );
    }
  }, [saved, draft]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(t);
  }, [notice]);
  useEffect(() => {
    if (composing) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [composing]);
  useEffect(() => {
    if (showAbout) aboutRef.current?.showModal();
    else aboutRef.current?.close();
  }, [showAbout]);
  useEffect(() => {
    setLimit(9);
  }, [query, topic, view, source]);
  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/briefs");
      if (!res.ok) throw new Error();
      setFeed(await res.json());
    } catch {
      setError(
        "Could not load your stories. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }
  const stories = view === "saved" ? saved : feed?.stories || [];
  const filtered = stories.filter(
    (s) =>
      (topic === "All stories" || topic === s.topic) &&
      (source === "All sources" || source === s.source) &&
      `${s.title} ${s.summary} ${s.source}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const sorted = [...filtered].sort((a, b) =>
    sort === "topic"
      ? a.topic.localeCompare(b.topic)
      : (b.publishedAt || "").localeCompare(a.publishedAt || ""),
  );
  function toggleSaved(story: Story) {
    setSaved((previous) =>
      previous.some((s) => s.id === story.id)
        ? previous.filter((s) => s.id !== story.id)
        : [...previous, story],
    );
  }
  function toggleDraft(story: Story) {
    setDraft((previous) => ({
      ...previous,
      stories: previous.stories.some((s) => s.id === story.id)
        ? previous.stories.filter((s) => s.id !== story.id)
        : [...previous.stories, story],
    }));
  }
  const body = emailText(draft.subject, draft.intro, draft.stories);
  async function copy() {
    try {
      await navigator.clipboard.writeText(body);
      setNotice("Brief copied. Ready to paste into your email.");
    } catch {
      setNotice("Clipboard unavailable. Download the email instead.");
    }
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([emailFile(draft.subject, body)], { type: "message/rfc822" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `signal-brief-${new Date().toISOString().slice(0, 10)}.eml`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("Email downloaded. Open it in your email app.");
  }
  function openEmail() {
    const url = `mailto:?subject=${encodeURIComponent(draft.subject.replace(/[\r\n]/g, " "))}&body=${encodeURIComponent(body)}`;
    if (url.length > 1800) {
      download();
      setNotice(
        "This brief is long, so we downloaded an email file for your mail app.",
      );
    } else window.location.href = url;
  }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="The Signal Brief home">
          <span className="brand-icon">
            <Radio size={23} />
          </span>
          <span>
            The Signal
            <span className="brand-second">
              Brief<span className="brand-dot">.</span>
            </span>
          </span>
        </a>
        <div className="workspace-label">YOUR DAILY PERSPECTIVE</div>
        <nav aria-label="Main navigation">
          <button
            className={view === "today" ? "nav-item active" : "nav-item"}
            onClick={() => setView("today")}
          >
            <LayoutGrid size={18} />
            Today's brief
            <span className="nav-active-dot" />
          </button>
          <button
            className={view === "saved" ? "nav-item active" : "nav-item"}
            onClick={() => setView("saved")}
          >
            <Bookmark size={18} />
            Saved stories<span className="nav-count">{saved.length}</span>
          </button>
          <button className="nav-item" onClick={() => setComposing(true)}>
            <Mail size={18} />
            Email composer
            <span className="nav-count">{draft.stories.length}</span>
          </button>
        </nav>
        <div className="sidebar-topics">
          <div className="workspace-label">EXPLORE TOPICS</div>
          {topics.slice(1).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTopic(t);
                setView("today");
              }}
              className="topic-link"
            >
              <span className={`topic-dot ${t.toLowerCase()}`} />
              {t}
              <ChevronRight size={13} />
            </button>
          ))}
        </div>
        <div className="sidebar-bottom">
          <div className="quiet-card">
            <span className="little-spark">
              <Sparkles size={18} />
            </span>
            <strong>
              Stay curious.
              <br />
              Skip the noise.
            </strong>
            <p>A clearer view of the world, one brief at a time.</p>
          </div>
          <button className="about-button" onClick={() => setShowAbout(true)}>
            <CircleHelp size={17} />
            About The Signal Brief
            <ArrowUpRight size={14} />
          </button>
          <div className="sidebar-footer">
            A little perspective goes a long way.
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Your workspace
            <ChevronRight size={14} />
            <strong>
              {view === "saved" ? "Saved stories" : "Today’s brief"}
            </strong>
          </div>
          <div className="topbar-right">
            <span className="edition">
              <span />
              DAILY EDITION
            </span>
            <button
              className="avatar"
              onClick={() => setShowAbout(true)}
              aria-label="About this workspace"
            >
              SB
            </button>
          </div>
        </header>
        <main>
          <div className="page-title">
            <div>
              <div className="eyebrow">
                <span className="eyebrow-line" />
                {today}
              </div>
              <h1>
                {view === "saved"
                  ? "Worth coming back to."
                  : "A world of news."}
                <br />
                <span>
                  {view === "saved"
                    ? "Your saved stories."
                    : "A little more clarity."}
                </span>
              </h1>
              <p>
                {view === "saved"
                  ? "The stories you’ve kept, ready when you are."
                  : "Search, media, and the wider world. Every story traced to its source."}
              </p>
            </div>
            <button
              className="refresh-button"
              onClick={() => void refresh()}
              disabled={loading}
            >
              <RefreshCw size={15} className={loading ? "spin" : ""} />
              Refresh stories
            </button>
          </div>
          <div className="content-layout">
            <section className="news-column" aria-label="News dashboard">
              {view === "today" && (
                <section className="hero-card">
                  <div className="hero-copy">
                    <div className="hero-label">
                      <span className="hero-live-dot" />
                      THE DAILY SIGNAL
                    </div>
                    <h2>
                      Less noise.
                      <br />
                      More perspective.
                    </h2>
                    <p>
                      Follow the signals shaping search, media,
                      <br className="desktop-break" /> and the world around your
                      business.
                    </p>
                    <button
                      onClick={() => {
                        document
                          .getElementById("story-feed")
                          ?.scrollIntoView({ behavior: "smooth" });
                        searchRef.current?.focus({ preventScroll: true });
                      }}
                    >
                      Explore the stories
                      <ArrowRight size={17} />
                    </button>
                  </div>
                  <div className="hero-art" aria-hidden="true">
                    <div className="orbit orbit-one" />
                    <div className="orbit orbit-two" />
                    <div className="orbit orbit-three" />
                    <Globe2 size={142} strokeWidth={0.65} />
                    <span className="orbit-dot dot-one" />
                    <span className="orbit-dot dot-two" />
                    <span className="art-plus">+</span>
                    <span className="art-caption">A CLEARER POINT OF VIEW</span>
                  </div>
                  <div className="hero-bottom">
                    <span>
                      <FileText size={13} />
                      {feed?.stories.length || "—"} stories in focus
                    </span>
                    <span>
                      Curiosity looks good on you
                      <ArrowUpRight size={13} />
                    </span>
                  </div>
                </section>
              )}
              <div className="feed-title" id="story-feed">
                <h2>
                  {view === "saved" ? "Your collection" : "On your radar"}
                  <span>{stories.length}</span>
                </h2>
                <span
                  className={`feed-status ${feed?.status === "live" ? "is-live" : ""}`}
                >
                  <span />
                  {loading
                    ? "Updating stories"
                    : feed?.status === "live"
                      ? "Live headlines"
                      : feed?.status === "stale"
                        ? "Last available headlines"
                        : "Feeds unavailable"}
                </span>
              </div>
              {feed?.status === "unavailable" && (
                <div className="sample-note">
                  <CircleHelp size={15} />
                  <span>
                    We can’t reach the news sources right now. No unverified or
                    sample stories are shown.
                  </span>
                </div>
              )}
              {feed?.status === "stale" && (
                <div className="sample-note">
                  <CircleHelp size={15} />
                  <span>
                    Feeds are temporarily unavailable. Showing headlines from{" "}
                    {new Date(feed.updatedAt!).toLocaleString()}.
                  </span>
                </div>
              )}
              <div className="feed-controls">
                <div className="search-box">
                  <Search size={17} />
                  <input
                    ref={searchRef}
                    placeholder="Find a story, topic, or idea…"
                    aria-label="Search stories"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  {query && (
                    <button
                      onClick={() => setQuery("")}
                      aria-label="Clear search"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
                <label className="sort-control">
                  <SlidersHorizontal size={15} />
                  <span className="sr-only">Sort stories</span>
                  <select
                    aria-label="Sort stories"
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                  >
                    <option value="latest">Latest first</option>
                    <option value="topic">By topic</option>
                  </select>
                </label>
              </div>
              <div className="source-filter-row">
                <label>
                  Publication
                  <select
                    aria-label="Filter by publication"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                  >
                    <option>All sources</option>
                    <option>Search Engine Land</option>
                    <option>BBC News</option>
                  </select>
                </label>
                <span>Source summaries · Direct article links</span>
              </div>
              <div className="tabs" aria-label="Filter by topic">
                {topics.map((t) => (
                  <button
                    key={t}
                    aria-pressed={topic === t}
                    className={topic === t ? "tab selected" : "tab"}
                    onClick={() => setTopic(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
              {error && (
                <div className="error-state" role="alert">
                  <p>{error}</p>
                  <button
                    className="text-button"
                    onClick={() => void refresh()}
                  >
                    Try again
                    <RefreshCw size={14} />
                  </button>
                </div>
              )}
              {loading && !feed ? (
                <div className="loading-state">
                  <LoaderCircle size={24} className="spin" />
                  <p>Finding your next perspective…</p>
                </div>
              ) : (
                <div className="story-grid">
                  {sorted.slice(0, limit).map((story) => (
                    <StoryCard
                      key={story.id}
                      story={story}
                      saved={saved.some((s) => s.id === story.id)}
                      selected={draft.stories.some((s) => s.id === story.id)}
                      onSave={() => toggleSaved(story)}
                      onSelect={() => toggleDraft(story)}
                    />
                  ))}
                </div>
              )}
              {!loading &&
              !sorted.length &&
              !error &&
              feed?.status === "unavailable" &&
              view === "today" ? (
                <div className="empty-state">
                  <Globe2 size={28} />
                  <h3>Good information starts at the source.</h3>
                  <p>
                    Live feeds are temporarily unavailable. Your saved stories
                    and email draft are still here.
                  </p>
                  <button
                    className="text-button"
                    onClick={() => void refresh()}
                  >
                    Try the feeds again
                    <RefreshCw size={14} />
                  </button>
                </div>
              ) : (
                !loading &&
                !sorted.length &&
                !error && (
                  <div className="empty-state">
                    <Bookmark size={28} />
                    <h3>
                      {view === "saved" && !saved.length
                        ? "Make room for a good story."
                        : "No stories found."}
                    </h3>
                    <p>
                      {view === "saved" && !saved.length
                        ? "Use the bookmark on any story to save it here."
                        : "Try another topic or a different search."}
                    </p>
                    <button
                      className="text-button"
                      onClick={() => {
                        setQuery("");
                        setTopic("All stories");
                        setSource("All sources");
                        if (view === "saved" && !saved.length) setView("today");
                      }}
                    >
                      Explore all stories
                      <ArrowRight size={15} />
                    </button>
                  </div>
                )
              )}
              {sorted.length > limit && (
                <button
                  className="load-more"
                  onClick={() => setLimit((n) => n + 9)}
                >
                  More perspectives
                  <ArrowDown size={16} />
                </button>
              )}
              {!!feed?.sources.length && (
                <details className="source-directory">
                  <summary>
                    Source feed status ·{" "}
                    {feed.sources.filter((s) => s.available).length}/
                    {feed.sources.length} available
                  </summary>
                  <ul>
                    {feed.sources.map((s) => (
                      <li key={s.feedUrl}>
                        <a href={s.feedUrl} target="_blank" rel="noreferrer">
                          {s.source} · {s.topic}
                          <ArrowUpRight size={11} />
                        </a>
                        <span className={s.available ? "source-available" : ""}>
                          {s.available ? "Available" : "Unavailable"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              <div className="feed-footer">
                <Radio size={14} />
                <span>A little less scrolling. A little more knowing.</span>
              </div>
            </section>
            <aside className="draft-column" aria-label="Daily email draft">
              <div className="draft-card">
                <div className="draft-heading">
                  <span className="mail-icon">
                    <Mail size={19} />
                  </span>
                  <span>YOUR DAILY EMAIL</span>
                  <span className="draft-tag">DRAFT</span>
                </div>
                <h2>
                  Good stories.
                  <br /> Worth sharing.
                </h2>
                <p className="draft-description">
                  Turn your picks into a thoughtful daily brief.
                </p>
                <div className="draft-divider" />
                <div className="draft-list-title">
                  <span>In your brief</span>
                  <span>
                    {draft.stories.length}{" "}
                    {draft.stories.length === 1 ? "story" : "stories"}
                  </span>
                </div>
                {draft.stories.length ? (
                  <ol className="draft-list">
                    {draft.stories.map((s, i) => (
                      <li key={s.id}>
                        <span className="draft-number">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <div>
                          <span
                            className={`mini-topic ${s.topic.toLowerCase()}`}
                          >
                            {s.topic}
                          </span>
                          <strong>{s.title}</strong>
                        </div>
                        <button
                          aria-label={`Remove ${s.title} from email`}
                          onClick={() => toggleDraft(s)}
                        >
                          <X size={14} />
                        </button>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className="draft-empty">
                    <span>
                      <Plus size={20} />
                    </span>
                    <strong>Your perspective starts here</strong>
                    <p>
                      Add stories with the <Plus size={11} /> button.
                      <br />
                      We’ll bring them together for you.
                    </p>
                  </div>
                )}
                <div className="draft-meta">
                  <span>
                    <FileText size={13} />
                    {draft.stories.length
                      ? `${readTime(draft.stories)} min read`
                      : "Made to be read"}
                  </span>
                  <span>
                    <CheckCheck size={14} />
                    Saved on this device
                  </span>
                </div>
                <button
                  className="primary-button compose-button"
                  onClick={() => setComposing(true)}
                >
                  Compose daily email
                  <ArrowUpRight size={17} />
                </button>
                <p className="draft-footnote">
                  Your voice. Your picks. A better inbox.
                </p>
              </div>
              <div className="perspective-note">
                <span>THE BIGGER PICTURE</span>
                <p>
                  Know the source.
                  <br />
                  See the signal.
                </p>
                <div>
                  Context before conclusions
                  <span />
                </div>
              </div>
              <div className="source-note">
                <Globe2 size={15} />
                <p>
                  Headlines and source summaries from Search Engine Land and BBC
                  News. Every story links to its original article.
                </p>
              </div>
            </aside>
          </div>
          <footer className="page-footer">
            <span>
              The Signal Brief<span className="brand-dot">.</span>
            </span>
            <span>Stay informed. Think independently.</span>
          </footer>
        </main>
      </div>
      <dialog
        ref={dialogRef}
        className="composer-dialog"
        onCancel={() => setComposing(false)}
        onClose={() => setComposing(false)}
      >
        <div className="dialog-header">
          <div>
            <span className="eyebrow">MAKE IT YOURS</span>
            <h2>Your daily brief.</h2>
          </div>
          <button
            className="icon-button"
            aria-label="Close email composer"
            onClick={() => setComposing(false)}
          >
            <X size={21} />
          </button>
        </div>
        <div className="composer-content">
          <label className="field-label">
            Subject
            <input
              value={draft.subject}
              maxLength={200}
              onChange={(e) =>
                setDraft((d) => ({ ...d, subject: e.target.value }))
              }
            />
          </label>
          <label className="field-label">
            Your opening note
            <textarea
              rows={4}
              value={draft.intro}
              maxLength={5000}
              onChange={(e) =>
                setDraft((d) => ({ ...d, intro: e.target.value }))
              }
            />
          </label>
          <div className="preview-heading">
            <span>EMAIL PREVIEW</span>
            <span>
              {draft.stories.length} stories · {readTime(draft.stories)} min
              read
            </span>
          </div>
          <div className="email-preview">
            <div className="email-brand">
              <Radio size={18} />
              THE SIGNAL BRIEF
            </div>
            <h3>{draft.subject || "Your daily brief"}</h3>
            <p className="email-intro">{draft.intro}</p>
            {draft.stories.map((s, i) => (
              <article key={s.id}>
                <span className="eyebrow">
                  {String(i + 1).padStart(2, "0")} / {s.topic}
                </span>
                <h4>{s.title}</h4>
                <p>{s.summary}</p>
                <p className="provenance-line">
                  {s.publishedAt
                    ? `Published ${new Date(s.publishedAt).toLocaleString()}`
                    : "Publication date not supplied"}{" "}
                  · Retrieved {new Date(s.retrievedAt).toLocaleString()}
                </p>
                {s.url && (
                  <a href={s.url} target="_blank" rel="noreferrer">
                    Read at {s.source}
                    <ArrowUpRight size={13} />
                  </a>
                )}
                <button
                  className="remove-preview"
                  onClick={() => toggleDraft(s)}
                  aria-label={`Remove ${s.title} from preview`}
                >
                  <Trash2 size={13} />
                  Remove
                </button>
              </article>
            ))}
            {!draft.stories.length && (
              <div className="empty-preview">
                <Mail size={24} />
                <p>Your selected stories will appear here.</p>
                <button
                  className="text-button"
                  onClick={() => setComposing(false)}
                >
                  Choose some stories
                  <ArrowRight size={14} />
                </button>
              </div>
            )}
            <div className="email-signoff">Curated with The Signal Brief.</div>
          </div>
        </div>
        <div className="composer-actions">
          <button
            className="secondary-button"
            disabled={!draft.stories.length}
            onClick={() => void copy()}
          >
            <Copy size={15} />
            Copy text
          </button>
          <button
            className="secondary-button"
            disabled={!draft.stories.length}
            onClick={download}
          >
            <Download size={15} />
            Download email
          </button>
          <button
            className="primary-button"
            disabled={!draft.stories.length || !draft.subject.trim()}
            onClick={openEmail}
          >
            <Send size={15} />
            Open in mail app
          </button>
        </div>
        <p className="composer-note">
          Review and send from your own email app. Long briefs download as an
          .eml file. Automatic delivery is not enabled.
        </p>
        {notice && (
          <p className="composer-feedback" role="status">
            {notice}
          </p>
        )}
      </dialog>
      <dialog
        ref={aboutRef}
        className="about-dialog"
        onCancel={() => setShowAbout(false)}
        onClose={() => setShowAbout(false)}
      >
        <button
          className="icon-button about-close"
          aria-label="Close about"
          onClick={() => setShowAbout(false)}
        >
          <X size={20} />
        </button>
        <Radio size={32} />
        <h2>A little more clarity.</h2>
        <p>
          The Signal Brief brings news headlines and source summaries together
          with a simple daily email composer.
        </p>
        <p>
          Stories come from Search Engine Land and BBC RSS feeds. Every story
          retains its original article link, source feed, and retrieval date. If
          feeds are unavailable, no sample or invented stories are shown.
          Summaries are supplied by the publisher, not generated by AI.
        </p>
        <p>
          Source attribution lets you verify the original reporting. It is not
          an independent fact check. Search Engine Land coverage includes SEO,
          paid search, and performance marketing.
        </p>
        <p>
          Your bookmarks and email draft stay in this browser. This version has
          no accounts, scheduled emails, or automatic sending.
        </p>
        <button className="primary-button" onClick={() => setShowAbout(false)}>
          Back to the brief
          <ArrowRight size={16} />
        </button>
      </dialog>
      {notice && !composing && (
        <div className="toast" role="status">
          <Check size={17} />
          {notice}
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
function StoryCard({
  story,
  saved,
  selected,
  onSave,
  onSelect,
}: {
  story: Story;
  saved: boolean;
  selected: boolean;
  onSave: () => void;
  onSelect: () => void;
}) {
  return (
    <article className={`story-card ${selected ? "in-draft" : ""}`}>
      <div className="story-top">
        <span className={`topic-pill ${story.topic.toLowerCase()}`}>
          <span />
          {story.topic}
        </span>
        <button
          className={`bookmark-button ${saved ? "is-saved" : ""}`}
          aria-label={`${saved ? "Unsave" : "Save"} ${story.title}`}
          aria-pressed={saved}
          onClick={onSave}
        >
          <Bookmark size={17} fill={saved ? "currentColor" : "none"} />
        </button>
      </div>
      <h3>
        {story.url ? (
          <a href={story.url} target="_blank" rel="noreferrer">
            {story.title}
            <ExternalLink size={13} />
          </a>
        ) : (
          story.title
        )}
      </h3>
      <p>{story.summary}</p>
      <div className="story-source">
        <span className="source-monogram">
          {story.source === "BBC News" ? "B" : "S"}
        </span>
        <span>{story.source}</span>
        <span className="source-date">
          {story.publishedAt
            ? new Date(story.publishedAt).toLocaleDateString("en", {
                month: "short",
                day: "numeric",
              })
            : "Date unavailable"}
        </span>
      </div>
      <details className="story-provenance">
        <summary>View source details</summary>
        <a href={story.url} target="_blank" rel="noreferrer">
          Original article
          <ArrowUpRight size={11} />
        </a>
        <a href={story.feedUrl} target="_blank" rel="noreferrer">
          Source RSS feed
          <ArrowUpRight size={11} />
        </a>
        <span>
          Published:{" "}
          {story.publishedAt
            ? new Date(story.publishedAt).toLocaleString()
            : "Not supplied"}
        </span>
        <span>Retrieved: {new Date(story.retrievedAt).toLocaleString()}</span>
        <span>Publisher-provided summary; not independently fact-checked.</span>
      </details>
      <div className="story-bottom">
        <span>
          {Math.max(1, Math.ceil(story.summary.split(/\s+/).length / 200))} min
          brief
        </span>
        <button
          className={selected ? "add-story selected-story" : "add-story"}
          aria-label={`${selected ? "Remove" : "Add"} ${story.title} ${selected ? "from" : "to"} email`}
          aria-pressed={selected}
          onClick={onSelect}
        >
          {selected ? <Check size={14} /> : <Plus size={14} />}
          {selected ? "In your brief" : "Add to brief"}
        </button>
      </div>
    </article>
  );
}
