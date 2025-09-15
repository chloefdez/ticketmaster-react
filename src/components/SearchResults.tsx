import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import zipcodes from "zipcodes";

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
    attractions?: { name?: string }[];
  };
};

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

/** Friendly date parser -> ISO range for Ticketmaster */
function parseDates(dates: string | null): { start?: string; end?: string } {
  if (!dates) return {};
  const s = dates.trim();

  const range = s.match(
    /^\s*(\d{4}-\d{2}-\d{2})\s+(?:to|-)\s+(\d{4}-\d{2}-\d{2})\s*$/i
  );
  if (range) {
    const [, a, b] = range;
    const start = new Date(a + "T00:00:00Z");
    const end = new Date(b + "T23:59:59Z");
    return { start: start.toISOString(), end: end.toISOString() };
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const start = new Date(s + "T00:00:00Z");
    const end = new Date(s + "T23:59:59Z");
    return { start: start.toISOString(), end: end.toISOString() };
  }

  const monthMatch = s.match(
    /^(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|\w+)\s+(\d{4})$/i
  );
  if (monthMatch) {
    const [, monthText, yearText] = monthMatch;
    const start = new Date(`${monthText} 1, ${yearText} 00:00:00Z`);
    const end = new Date(start);
    end.setMonth(start.getMonth() + 1);
    end.setSeconds(end.getSeconds() - 1);
    return { start: start.toISOString(), end: end.toISOString() };
  }

  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const start = new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0)
    );
    const end = new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59)
    );
    return { start: start.toISOString(), end: end.toISOString() };
  }

  return {};
}

const isZip = (s: string) => /^\d{5}(?:-\d{4})?$/.test(s);

const SearchResults: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const q = (params.get("q") || "").trim();
  const loc = (params.get("city") || "").trim();
  const dates = (params.get("dates") || "").trim();
  const page = Number(params.get("page") || "0");

  const [events, setEvents] = useState<TMEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageInfo, setPageInfo] = useState<{
    number: number;
    totalPages: number;
  } | null>(null);

  useEffect(() => {
    const API_KEY = import.meta.env.VITE_TICKETMASTER_API_KEY;
    if (!API_KEY) {
      setError("Missing Ticketmaster API key");
      return;
    }

    const { start, end } = parseDates(dates || null);

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
        const z = zipcodes.lookup(zip5);
        if (
          z &&
          typeof z.latitude === "number" &&
          typeof z.longitude === "number"
        ) {
          // Use radius search via latlong
          search.set("latlong", `${z.latitude},${z.longitude}`);
          search.set("radius", "50"); // adjust if you want
          search.set("unit", "miles");
        } else {
          // Fallback to exact postalCode match (may be sparse)
          search.set("postalCode", zip5);
        }
      } else {
        search.set("city", loc);
      }
    }

    if (start) search.set("startDateTime", start);
    if (end) search.set("endDateTime", end);

    const url = `https://app.ticketmaster.com/discovery/v2/events.json?${search.toString()}`;

    const controller = new AbortController();
    (async () => {
      try {
        setLoading(true);
        setError(null);
        setEvents([]);

        const res = await fetchWithRetry(url, { signal: controller.signal });
        const json = await res.json();

        const evs: TMEvent[] = json._embedded?.events ?? [];
        setEvents(evs);
        const pageObj = json.page ?? { number: page, totalPages: page + 1 };
        setPageInfo({ number: pageObj.number, totalPages: pageObj.totalPages });
      } catch (e: any) {
        if (e?.name !== "AbortError")
          setError(e?.message || "Failed to search");
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [q, loc, dates, page]);

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
      p.delete(key);
      p.set("page", "0");
      return p;
    });
  };
  const clearAll = () => setParams(new URLSearchParams());

  const title = useMemo(() => {
    if (q) return `Results for “${q}”`;
    if (loc || dates) return "Results";
    return "Search";
  }, [q, loc, dates]);

  const hasLoc = !!loc;
  const locChipLabel = isZip(loc) ? `ZIP: ${loc}` : `City: ${loc}`;

  return (
    <section className="pt-4 md:pt-6">
      <div className="px-6 md:px-12">
        <h2 className="text-[22px] md:text-[26px] font-semibold">{title}</h2>

        {(hasLoc || dates) && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {hasLoc && (
              <button
                onClick={() => clearOne("city")}
                className="px-3 py-1.5 text-sm rounded-full bg-gray-100 hover:bg-gray-200"
                title="Remove location filter"
              >
                {locChipLabel} ×
              </button>
            )}
            {dates && (
              <button
                onClick={() => clearOne("dates")}
                className="px-3 py-1.5 text-sm rounded-full bg-gray-100 hover:bg-gray-200"
                title="Remove date filter"
              >
                Dates: {dates} ×
              </button>
            )}
            {(hasLoc || dates) && (
              <button
                onClick={clearAll}
                className="ml-2 px-3 py-1.5 text-sm rounded-full border border-gray-300 hover:bg-gray-50"
              >
                Clear all
              </button>
            )}
          </div>
        )}

        {error && <p className="text-red-600 mt-3">Error: {error}</p>}
      </div>

      {loading && (
        <div className="px-6 md:px-12 mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl overflow-hidden bg-gray-200 h-60 animate-pulse"
            />
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
            <div className="px-6 md:px-12 mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((ev) => {
                const img = pickImg(ev);
                const d = ev.dates?.start?.localDate
                  ? new Date(ev.dates.start.localDate).toLocaleDateString(
                      "en-US",
                      {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      }
                    )
                  : undefined;

                const venue = (() => {
                  const v = ev._embedded?.venues?.[0];
                  const city = v?.city?.name;
                  const st = v?.state?.stateCode;
                  return [v?.name, city && st ? `${city}, ${st}` : city]
                    .filter(Boolean)
                    .join(" • ");
                })();

                return (
                  <div
                    key={ev.id ?? ev.url}
                    className="rounded-2xl overflow-hidden bg-white shadow hover:shadow-md transition"
                  >
                    {img ? (
                      <img
                        src={img}
                        alt={ev.name}
                        className="h-44 w-full object-cover"
                      />
                    ) : (
                      <div className="h-44 w-full bg-gray-200" />
                    )}
                    <div className="p-4">
                      <p className="text-[13px] text-gray-500 mb-1 line-clamp-1">
                        {venue || "Featured event"}
                      </p>
                      <h3 className="text-[17.5px] font-semibold leading-snug line-clamp-2">
                        {ev.name}
                      </h3>
                      {d && (
                        <p className="mt-1 text-[13px] text-gray-500">{d}</p>
                      )}

                      <div className="mt-4 flex items-center gap-3">
                        <a
                          href={ev.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
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
                            image: pickImg(ev),
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
            <div className="px-6 md:px-12 mt-8 flex items-center justify-between">
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
    </section>
  );
};

export default SearchResults;