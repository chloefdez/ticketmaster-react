import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

type TMEvent = {
  id?: string;
  name: string;
  url: string;
  classifications?: { segment?: { name?: string } }[];
  images: { url: string; width: number; height: number }[];
  dates?: { start?: { localDate?: string } };
  _embedded?: {
    venues?: {
      name?: string;
      city?: { name?: string };
      state?: { stateCode?: string };
    }[];
    attractions?: { name?: string }[];
  };
};

function shuffleInPlace<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function fetchWithRetry(url: string, opts: RequestInit = {}, max = 2) {
  let attempt = 0;
  while (true) {
    try {
      const res = await fetch(url, opts);
      if (res.ok) return res;
      if ((res.status === 429 || res.status >= 500) && attempt < max) {
        await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)));
        attempt++;
        continue;
      }
      throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      if (attempt < max) {
        await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)));
        attempt++;
        continue;
      }
      throw e;
    }
  }
}

// --------- smarter keys to detect "same artist" even with different titles ----------
const stripPunct = (s: string) =>
  s.replace(/[^\p{Letter}\p{Number}]+/gu, " ").trim();
const norm = (s: string) => stripPunct(s.toLowerCase());

// try attractions first; else derive from event name
function getArtistKey(ev: TMEvent): string {
  const a = ev._embedded?.attractions?.[0]?.name;
  if (a) return norm(a);

  let t = ev.name || "";
  // common separators: " - ", " at ", " @ "
  const cuts = [" - ", " at ", " @ "];
  for (const c of cuts) {
    const idx = t.toLowerCase().indexOf(c.trim());
    if (idx > 0) {
      t = t.slice(0, idx);
      break;
    }
  }
  // drop words that cause false “duplicates”
  t = t
    .replace(
      /\b(live|tour|suite reservation|vip|experience|show|tickets)\b/gi,
      ""
    )
    .trim();
  return norm(t);
}

function getVenueKey(ev: TMEvent): string {
  const v = ev._embedded?.venues?.[0];
  return norm([v?.name].filter(Boolean).join(" "));
}

function getCityKey(ev: TMEvent): string {
  const v = ev._embedded?.venues?.[0];
  const city = v?.city?.name;
  const st = v?.state?.stateCode;
  return norm([city, st].filter(Boolean).join(", "));
}

// keep only first image >= 1000x500
function pickImg(ev: TMEvent) {
  return (
    ev.images
      ?.filter((i) => i.width >= 1000 && i.height >= 500)
      .sort((a, b) => b.width - a.width)[0]?.url || ev.images?.[0]?.url
  );
}

const DiscoverMore: React.FC = () => {
  const [events, setEvents] = useState<TMEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const API_KEY = import.meta.env.VITE_TICKETMASTER_API_KEY;
    if (!API_KEY) {
      setError("Missing Ticketmaster API key");
      setLoading(false);
      return;
    }

    // randomize pages a little so refreshes feel fresh
    const pageNum = Math.floor(Math.random() * 5);

    const makeUrl = (classificationName: string) => {
      const s = new URLSearchParams();
      s.set("apikey", API_KEY);
      s.set("countryCode", "US");
      s.set("size", "24");
      s.set("sort", "relevance,desc");
      s.set("page", String(pageNum));
      s.set("classificationName", classificationName);
      return `/tmapi/discovery/v2/events.json?${s.toString()}`;
    };

    const urls = [
      makeUrl("Music"),
      makeUrl("Sports"),
      makeUrl("Arts & Theatre"),
    ];

    const controller = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const results = await Promise.all(
          urls.map((u) =>
            fetchWithRetry(u, { signal: controller.signal }).then((r) =>
              r.json()
            )
          )
        );

        const pools = results.map(
          (d) => (d._embedded?.events ?? []) as TMEvent[]
        );
        const music = pools[0] ?? [];
        const sports = pools[1] ?? [];
        const theater = pools[2] ?? [];

        // --- de-dupe within each pool by artistKey to start
        const dedupeBy = (arr: TMEvent[], keyFn: (e: TMEvent) => string) => {
          const seen = new Set<string>();
          return arr.filter((e) => {
            const k = keyFn(e);
            if (!k) return false;
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
          });
        };

        const m1 = dedupeBy(music, getArtistKey);
        const s1 = dedupeBy(sports, getArtistKey);
        const t1 = dedupeBy(theater, getArtistKey);

        // --- target mix
        const TARGETS = { music: 6, sports: 3, theater: 3 };
        const pick = (arr: TMEvent[], n: number) =>
          shuffleInPlace(arr.slice()).slice(0, n);

        let candidate = [
          ...pick(m1, TARGETS.music),
          ...pick(s1, TARGETS.sports),
          ...pick(t1, TARGETS.theater),
        ];

        // backfill to 12 with the rest of the unique events (across all pools)
        const union = dedupeBy([...m1, ...s1, ...t1], getArtistKey);
        if (candidate.length < 12) {
          const left = union.filter(
            (e) => !candidate.find((c) => (c.id ?? c.url) === (e.id ?? e.url))
          );
          candidate = [...candidate, ...pick(left, 12 - candidate.length)];
        }

        // --- enforce caps per artist/venue/city to break repeats even further
        const MAX_PER_ARTIST = 1;
        const MAX_PER_VENUE = 1;
        const MAX_PER_CITY = 1;

        const artistCount = new Map<string, number>();
        const venueCount = new Map<string, number>();
        const cityCount = new Map<string, number>();

        const final: TMEvent[] = [];
        for (const e of candidate) {
          const a = getArtistKey(e);
          const v = getVenueKey(e);
          const c = getCityKey(e);

          const ac = (artistCount.get(a) ?? 0) + 1;
          const vc = (venueCount.get(v) ?? 0) + 1;
          const cc = (cityCount.get(c) ?? 0) + 1;

          if (a && ac > MAX_PER_ARTIST) continue;
          if (v && vc > MAX_PER_VENUE) continue;
          if (c && cc > MAX_PER_CITY) continue;

          artistCount.set(a, ac);
          venueCount.set(v, vc);
          cityCount.set(c, cc);
          final.push(e);
          if (final.length >= 12) break;
        }

        setEvents(final);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        const msg =
          err instanceof Error
            ? err.message
            : typeof err === "string"
            ? err
            : "Failed to fetch";
        setError(msg);
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, []);

  const scrollByAmount = (dir: "left" | "right") => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -520 : 520, behavior: "smooth" });
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) {
      scrollerRef.current?.scrollBy({ left: e.deltaY, behavior: "smooth" });
    }
  };

  const content = useMemo(() => {
    if (loading) {
      return (
        <div className="px-6 md:px-12">
          <div className="h-[220px] md:h-[260px] rounded-2xl bg-gray-200 animate-pulse" />
        </div>
      );
    }
    if (error) {
      return (
        <div className="px-6 md:px-12">
          <p className="text-red-600">Error: {error}</p>
        </div>
      );
    }
    if (!events.length) return null;

    return (
      <div className="relative group">
        {/* chevrons */}
        <button
          type="button"
          aria-label="Scroll left"
          onClick={() => scrollByAmount("left")}
          className="hidden md:flex items-center justify-center absolute left-0 top-1/2 -translate-y-1/2 z-20 h-14 w-14 rounded-full bg-blue-600/90 text-white shadow-lg hover:bg-blue-600 opacity-0 group-hover:opacity-100 transition"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          type="button"
          aria-label="Scroll right"
          onClick={() => scrollByAmount("right")}
          className="hidden md:flex items-center justify-center absolute right-0 top-1/2 -translate-y-1/2 z-20 h-14 w-14 rounded-full bg-blue-600/90 text-white shadow-lg hover:bg-blue-600 opacity-0 group-hover:opacity-100 transition"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M9 6l6 6-6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {/* fades */}
        <div className="pointer-events-none hidden md:block absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-white to-transparent z-10" />
        <div className="pointer-events-none hidden md:block absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-white to-transparent z-10" />

        <div
          ref={scrollerRef}
          onWheel={handleWheel}
          className="mt-5 md:mt-6 flex gap-6 md:gap-8 overflow-x-auto snap-x snap-mandatory px-6 md:px-12 py-1 scroll-smooth"
        >
          {events.map((ev) => {
            const img = pickImg(ev);

            const venue = (() => {
              const v = ev._embedded?.venues?.[0];
              if (!v) return null;
              const city = v.city?.name;
              const state = v.state?.stateCode;
              return [v.name, city && state ? `${city}, ${state}` : city]
                .filter(Boolean)
                .join(" • ");
            })();

            const date = (() => {
              const d = ev.dates?.start?.localDate;
              if (!d) return null;
              try {
                return new Date(d).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });
              } catch {
                return d;
              }
            })();

            return (
              <div
                key={ev.id ?? ev.url}
                className="group/card snap-start shrink-0 w-[380px] md:w-[480px] rounded-2xl overflow-hidden bg-white shadow-[0_1px_10px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition"
              >
                <div className="relative">
                  {img ? (
                    <img
                      src={img}
                      alt={ev.name}
                      className="h-[240px] md:h-[280px] w-full object-cover transition-transform duration-300 group-hover/card:scale-[1.02]"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="h-[240px] md:h-[280px] w-full bg-gray-200" />
                  )}
                  <div className="pointer-events-none absolute inset-0 bg-blue-600/0 group-hover/card:bg-blue-600/12 transition" />
                </div>

                <div className="px-5 py-4">
                  {venue ? (
                    <p className="text-[13px] text-gray-500 mb-1 line-clamp-1">
                      {venue}
                    </p>
                  ) : (
                    <p className="text-[13px] text-gray-500 mb-1">
                      Featured event
                    </p>
                  )}
                  <h3 className="text-[17.5px] font-semibold leading-snug line-clamp-2">
                    {ev.name}
                  </h3>
                  {date && (
                    <p className="mt-1 text-[13px] text-gray-500">{date}</p>
                  )}

                  {/* CTA row */}
                  <div className="mt-4 flex items-center gap-3">
                    {/* Primary: Ticketmaster external link */}
                    <a
                      href={ev.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition"
                    >
                      Buy Tickets
                    </a>

                    {/* Secondary: local preview (switch to /event/:id later) */}
                    <Link
                      to={
                        ev.id
                          ? `/event/${encodeURIComponent(ev.id)}`
                          : "/eventdetails"
                      }
                      state={{
                        title: ev.name,
                        date,
                        venue,
                        image: img,
                        url: ev.url, // ← add this
                      }}
                      className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
                    >
                      Details
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }, [events, error, loading]);

  return (
    <section className="pt-10 md:pt-12 pb-16 md:pb-20">
      <div className="px-6 md:px-12">
        <h2 className="text-[22px] md:text-[26px] font-semibold">
          Discover More
        </h2>
      </div>
      {content}
    </section>
  );
};

export default DiscoverMore;