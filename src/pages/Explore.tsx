import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { adapter } from "../data/adapter";
import { usePolled } from "../data/usePolled";
import { Button, ButtonLink } from "../components/Button";
import { EventCard } from "../components/EventCard";
import { Icon } from "../components/Icon";
import { Footer } from "../Shell";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "workshop", label: "Workshops" },
  { id: "meetup", label: "Meetups" },
  { id: "creative", label: "Creative" },
] as const;

export function Explore() {
  const [params, setParams] = useSearchParams();
  const category = params.get("category") ?? "all";
  const q = params.get("q") ?? "";
  const [draft, setDraft] = useState(q);

  // debounce typing into the URL (which drives the query)
  useEffect(() => {
    const id = window.setTimeout(() => {
      if (draft === q) return;
      const next = new URLSearchParams(params);
      if (draft.trim()) next.set("q", draft);
      else next.delete("q");
      setParams(next, { replace: true });
    }, 180);
    return () => window.clearTimeout(id);
  }, [draft, q, params, setParams]);

  const { data, error, loading } = usePolled(`events:${category}:${q}`, () => adapter.listEvents({ q, category }), 4000);
  const [feature, ...rest] = data ?? [];

  const setCategory = (id: string) => {
    const next = new URLSearchParams(params);
    if (id === "all") next.delete("category");
    else next.set("category", id);
    setParams(next, { replace: true });
  };

  return (
    <>
      <div className="wrap pt-10 md:pt-14 pb-16 md:pb-24 grid lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)] gap-10 lg:gap-12">
        <aside className="lg:sticky lg:top-[calc(var(--header-h)+48px)] self-start">
          <h1 className="display display-xl">
            <span className="block rise" style={{ ["--i" as string]: 0 }}>Find your</span>
            <span className="block rise" style={{ ["--i" as string]: 1 }}>people.</span>
          </h1>
          <p className="mt-6 text-[18px] text-muted rise" style={{ ["--i" as string]: 2 }}>
            Small gatherings. One collective yes.
          </p>

          <div className="mt-9 rise" style={{ ["--i" as string]: 3 }}>
            <label htmlFor="search" className="sr-only">
              Search gatherings
            </label>
            <div className="relative">
              <Icon name="search" size={22} className="absolute left-5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <input
                id="search"
                type="search"
                inputMode="search"
                autoComplete="off"
                className="input !min-h-[60px] !pl-[58px] !text-[17px]"
                placeholder="Search gatherings"
                value={draft}
                onChange={(ev) => setDraft(ev.target.value)}
              />
            </div>
          </div>

          <div
            role="tablist"
            aria-label="Filter by type"
            className="mt-6 flex gap-7 overflow-x-auto scrollbar-none rise -mx-1 px-1"
            style={{ ["--i" as string]: 4 }}
          >
            {FILTERS.map((f) => (
              <button
                key={f.id}
                role="tab"
                type="button"
                aria-selected={category === f.id}
                className="tab text-[16px] shrink-0"
                onClick={() => setCategory(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <p className="mt-6 text-[14px] text-dim" aria-live="polite">
            {data ? `${data.length} gathering${data.length === 1 ? "" : "s"}${q ? ` matching “${q}”` : ""}` : " "}
          </p>
        </aside>

        <section aria-label="Gatherings" className="min-w-0">
          {error && !data && (
            <div className="panel p-8">
              <p className="text-[18px]">We couldn’t load gatherings.</p>
              <p className="text-muted mt-2">{error.message}</p>
            </div>
          )}

          {loading && !data && (
            <div className="grid xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-5">
              <div className="min-h-[560px] border border-line bg-panel animate-pulse xl:row-span-2" />
              <div className="min-h-[270px] border border-line bg-panel animate-pulse" />
              <div className="min-h-[270px] border border-line bg-panel animate-pulse" />
            </div>
          )}

          {data && data.length === 0 && (
            <div className="panel p-8 md:p-12 max-w-2xl">
              <p className="eyebrow text-muted">No matches</p>
              <p className="title text-[32px] mt-4">Nothing like that yet.</p>
              <p className="text-muted mt-3 text-[17px]">
                Maybe it’s yours to start. Every gathering here began as one person’s idea.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <ButtonLink to="/create" arrow="up-right">
                  Start “{q || "something"}”
                </ButtonLink>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDraft("");
                    setParams({}, { replace: true });
                  }}
                >
                  Clear filters
                </Button>
              </div>
            </div>
          )}

          {feature && (
            <div className="grid xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-5">
              <EventCard event={feature} variant="feature" className="xl:row-span-2 rise" style={{ ["--i" as string]: 2 }} />
              {rest.map((e, i) => (
                <EventCard key={e.id} event={e} className="rise" style={{ ["--i" as string]: i + 3 }} />
              ))}
            </div>
          )}
        </section>
      </div>
      <Footer />
    </>
  );
}
