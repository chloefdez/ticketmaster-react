import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import zipcodes from "zipcodes";

/* ---------- types ---------- */
type TMEvent = {
  id?: string;
  name?: string;
  url?: string;
  images?: { url: string; width: number; height: number }[];
  dates?: { start?: { localDate?: string } };
  _embedded?: {
    venues?: {
      name?: string;
      city?: { name?: string };
      state?: { stateCode?: string };
    }[];
  };
};

type ZipInfo = {
  zip: string;
  latitude: number;
  longitude: number;
  city?: string;
  state?: string;
};

/* ---------- utils ---------- */
function pickImg(ev: TMEvent) {
  return (
    ev.images
      ?.filter((i) => i.width >= 1000 && i.height >= 500)
      .sort((a, b) => b.width - a.width)[0]?.url || ev.images?.[0]?.url
  );
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

/** normalize to TM ISO (UTC, no milliseconds) */
function toTmIso(d: Date | string) {
  const iso = (d instanceof Date ? d : new Date(d)).toISOString();
  return iso.replace(/\.\d{3}Z$/, "Z");
}

/** parses free-form "dates" param */
function parseDates(dates: string | null): { start?: string; end?: string } {
  if (!dates) return {};
  const s = dates.trim();

  const range = s.match(
    /^\s*(\d{4}-\d{2}-\d{2})\s+(?:to|-)\s+(\d{4}-\d{2}-\d{2})\s*$/i
  );
  if (range) {
    const [, a, b] = range;
    const start = toTmIso(new Date(a + "T00:00:00Z"));
    const end = toTmIso(new Date(b + "T23:59:59Z"));
    return { start, end };
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const start = toTmIso(new Date(s + "T00:00:00Z"));
    const end = toTmIso(new Date(s + "T23:59:59Z"));
    return { start, end };
  }

  const monthMatch = s.match(
    /^(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|\w+)\s+(\d{4})$/i
  );
  if (monthMatch) {
    const [, monthText, yearText] = monthMatch;
    const startDate = new Date(`${monthText} 1, ${yearText} 00:00:00Z`);
    const endDate = new Date(startDate);
    endDate.setUTCMonth(startDate.getUTCMonth() + 1);
    endDate.setUTCSeconds(endDate.getUTCSeconds() - 1);
    return { start: toTmIso(startDate), end: toTmIso(endDate) };
  }

  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const startDate = new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0)
    );
    const endDate = new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59)
    );
    return { start: toTmIso(startDate), end: toTmIso(endDate) };
  }

  return {};
}

const isZip = (s: string) => /^\d{5}(?:-\d{4})?$/.test(s);

/** unify all date param shapes into UTC ISO seconds (no ms) */
function resolveDateRangeISO(sp: URLSearchParams): {
  start?: string;
  end?: string;
} {
  const startISO = sp.get("startDateTime")?.trim();
  const endISO = sp.get("endDateTime")?.trim();
  const from = sp.get("from")?.trim();
  const to = sp.get("to")?.trim();
  const dates = sp.get("dates")?.trim();

  if (startISO || endISO) {
    const s = startISO ? toTmIso(startISO) : undefined;
    const e = endISO ? toTmIso(endISO) : undefined;
    if (s && e) return { start: s, end: e };
    if (s && !e) {
      const d = new Date(s);
      const end = new Date(d);
      end.setUTCHours(23, 59, 59, 0);
      return { start: s, end: toTmIso(end) };
    }
    if (!s && e) {
      const d = new Date(e);
      const start = new Date(d);
      start.setUTCHours(0, 0, 0, 0);
      return { start: toTmIso(start), end: e };
    }
  }

  if (from || to) {
    const a = from || to!;
    const b = to || from!;
    const start = new Date(a + "T00:00:00Z");
    const end = new Date(b + "T23:59:59Z");
    return { start: toTmIso(start), end: toTmIso(end) };
  }

  return parseDates(dates || null);
}

function formatChipLabel(start?: string, end?: string) {
  if (!start || !end) return "";
  const s = new Date(start);
  const e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  return `${s.toLocaleDateString("en-US", opts)} – ${e.toLocaleDateString(
    "en-US",
    opts
  )}`;
}

/* ---------- component ---------- */
const SearchResults: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const q = (params.get("q") || "").trim();
  const loc = (params.get("city") || "").trim();
  const page = Number(params.get("page") || "0");
  const cat = (params.get("cat") || "").trim().toLowerCase(); // "music" | "sports" | "arts"

  const { start, end } = resolveDateRangeISO(params);

  const [events, setEvents] = useState<TMEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageInfo, setPageInfo] = useState<{
    number: number;
    totalPages: number;
  } | null>(null);

  // Ticketmaster segment IDs (stable)
  const SEGMENT_BY_CAT: Record<string, string> = {
    music: "KZFzniwnSyZfZ7v7nJ",
    sports: "KZFzniwnSyZfZ7v7nE",
    arts: "KZFzniwnSyZfZ7v7na", // Arts & Theatre
  };

  useEffect(() => {
    const API_KEY = import.meta.env.VITE_TICKETMASTER_API_KEY;
    if (!API_KEY) {
      setError("Missing Ticketmaster API key");
      return;
    }

    const search = new URLSearchParams();
    search.set("apikey", API_KEY);
    search.set("countryCode", "US");
    search.set("size", "24");
    search.set("sort", "relevance,desc");
    search.set("page", String(page));
    if (q) search.set("keyword", q);

    if (loc) {
      if (isZip(loc)) {
        const zip5 = loc.slice(0, 5);
        const z = zipcodes.lookup(zip5) as ZipInfo | null;
        if (
          z &&
          typeof z.latitude === "number" &&
          typeof z.longitude === "number"
        ) {
          search.set("latlong", `${z.latitude},${z.longitude}`);
          search.set("radius", "50");
          search.set("unit", "miles");
        } else {
          search.set("postalCode", zip5);
        }
      } else {
        search.set("city", loc);
      }
    }

    if (start) search.set("startDateTime", start);
    if (end) search.set("endDateTime", end);

    // category filter: use segmentId (more reliable than classificationName)
    const seg = SEGMENT_BY_CAT[cat];
    if (seg) search.set("segmentId", seg);

    // go through dev proxy for CORS safety
    const base = "/api/tm?path=discovery/v2/events.json&";
    const url = `${base}${search.toString()}`;

    const controller = new AbortController();
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetchWithRetry(url, { signal: controller.signal });
        const json = await res.json();

        if (cancelled) return;

        const evs: TMEvent[] = json._embedded?.events ?? [];
        setEvents(evs);

        const pageObj = json.page ?? { number: page, totalPages: page + 1 };
        setPageInfo({ number: pageObj.number, totalPages: pageObj.totalPages });
      } catch (e: any) {
        const msg = String(e?.message || "");
        const name = String(e?.name || "");
        const aborted =
          controller.signal.aborted ||
          name === "AbortError" ||
          msg.toLowerCase().includes("aborted");
        if (cancelled || aborted) return;
        setError(msg || "Failed to fetch");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [q, loc, page, start, end, cat]); // <-- include cat

  const onPrev = () => {
    if ((pageInfo?.number ?? 0) > 0) {
      setParams((p) => {
        p.set("page", String(page - 1));
        return p;
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };
  const onNext = () => {
    const last = (pageInfo?.totalPages ?? 1) - 1;
    if ((pageInfo?.number ?? 0) < last) {
      setParams((p) => {
        p.set("page", String(page + 1));
        return p;
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const clearOne = (key: "q" | "city" | "dates") => {
    setParams((p) => {
      if (key === "dates") {
        ["dates", "from", "to", "startDateTime", "endDateTime"].forEach((k) =>
          p.delete(k)
        );
      } else {
        p.delete(key);
      }
      p.set("page", "0");
      return p;
    });
  };
  const clearAll = () => setParams(new URLSearchParams());

  const title = useMemo(() => {
    if (q) return `Results for “${q}”`;
    if (loc || start || end) return "Results";
    return "Search";
  }, [q, loc, start, end]);

  const locChipLabel = isZip(loc) ? `ZIP: ${loc}` : `City: ${loc}`;
  const datesChipLabel = useMemo(() => {
    if (start && end) return formatChipLabel(start, end);
    return "";
  }, [start, end]);

  return (
    <section className="pt-4 md:pt-6">
      <div className="px-6 md:px-12">
        <h2 className="text-[22px] md:text-[26px] font-semibold">{title}</h2>

        {(loc || datesChipLabel) && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {loc && (
              <button
                onClick={() => clearOne("city")}
                className="px-3 py-1.5 text-sm rounded-full bg-gray-100 hover:bg-gray-200"
              >
                {locChipLabel} ×
              </button>
            )}
            {datesChipLabel && (
              <button
                onClick={() => clearOne("dates")}
                className="px-3 py-1.5 text-sm rounded-full bg-gray-100 hover:bg-gray-200"
              >
                {datesChipLabel} ×
              </button>
            )}
            {(loc || datesChipLabel) && (
              <button
                onClick={clearAll}
                className="ml-2 px-3 py-1.5 text-sm rounded-full border border-gray-300 hover:bg-gray-50"
              >
                Clear all
              </button>
            )}
          </div>
        )}
      </div>

      {loading && (
        <div className="px-6 md:px-12 mt-5 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="w-full rounded-xl border border-gray-200 bg-white overflow-hidden"
            >
              <div className="flex gap-4 p-4 items-center">
                <div className="h-20 w-32 bg-gray-200 rounded-md animate-pulse" />
                <div className="flex-1">
                  <div className="h-4 w-2/3 bg-gray-200 rounded animate-pulse mb-2" />
                  <div className="h-3 w-1/3 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="h-9 w-28 bg-gray-200 rounded-md animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && (
        <>
          {!events.length ? (
            <div className="px-6 md:px-12 mt-6 text-gray-600">
              No results. Try a different search term or adjust filters.
            </div>
          ) : (
            <div className="px-6 md:px-12 mt-5 space-y-4">
              {events.map((ev) => {
                const img = pickImg(ev);
                const d = ev.dates?.start?.localDate
                  ? new Date(ev.dates.start.localDate).toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric", year: "numeric" }
                    )
                  : undefined;

                const v = ev._embedded?.venues?.[0];
                const venue = (() => {
                  const city = v?.city?.name;
                  const st = v?.state?.stateCode;
                  return [v?.name, city && st ? `${city}, ${st}` : city]
                    .filter(Boolean)
                    .join(" • ");
                })();

                return (
                  <div
                    key={ev.id ?? ev.url}
                    className="w-full rounded-xl border border-gray-200 bg-white overflow-hidden hover:shadow transition"
                  >
                    <div className="flex flex-col md:flex-row gap-4 p-4 items-stretch md:items-center">
                      <div className="shrink-0">
                        {img ? (
                          <img
                            src={img}
                            alt={ev.name}
                            className="h-24 w-40 object-cover rounded-md"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div className="h-24 w-40 bg-gray-200 rounded-md" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-[17px] font-semibold leading-snug truncate">
                          {ev.name}
                        </h3>
                        <div className="mt-1 text-[13px] text-gray-500 flex flex-wrap gap-x-3 gap-y-1">
                          {d && <span>{d}</span>}
                          {venue && <span className="truncate">{venue}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 md:ml-4">
                        <a
                          href={ev.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
                          aria-label={`Buy tickets for ${ev.name}`}
                        >
                          Buy Tickets
                        </a>
                        <Link
                          to={
                            ev.id
                              ? `/event/${encodeURIComponent(ev.id)}`
                              : "/eventdetails"
                          }
                          state={{
                            title: ev.name,
                            date: d,
                            venue,
                            image: img,
                            url: ev.url,
                          }}
                          className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 transition"
                        >
                          Details
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!!events.length && (
            <div className="px-6 md:px-12 mt-8 pb-12 flex items-center justify-between">
              <button
                onClick={onPrev}
                disabled={!pageInfo || pageInfo.number <= 0}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Prev
              </button>
              <div className="text-sm text-gray-500">
                Page {(pageInfo?.number ?? 0) + 1} of{" "}
                {pageInfo?.totalPages ?? 1}
              </div>
              <button
                onClick={onNext}
                disabled={
                  !pageInfo ||
                  (pageInfo.number ?? 0) >= (pageInfo.totalPages ?? 1) - 1
                }
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {error && (
        <div className="px-6 md:px-12 mt-6 text-red-600">Error: {error}</div>
      )}
    </section>
  );
};

export default SearchResults;