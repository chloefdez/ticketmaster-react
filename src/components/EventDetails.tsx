import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams, Link } from "react-router-dom";

type StateProps = {
  title?: string;
  date?: string;
  venue?: string;
  image?: string;
  description?: string;
  url?: string;
};

type TMEvent = {
  id?: string;
  name?: string;
  url?: string;
  info?: string;
  pleaseNote?: string;
  images?: { url: string; width: number; height: number }[];
  dates?: { start?: { localDate?: string; dateTime?: string } };
  _embedded?: {
    venues?: {
      name?: string;
      city?: { name?: string };
      state?: { stateCode?: string };
    }[];
    attractions?: { id?: string; name?: string }[];
  };
};

const pickLargeImage = (ev?: TMEvent) =>
  ev?.images
    ?.filter((i) => i.width >= 1000 && i.height >= 500)
    .sort((a, b) => b.width - a.width)[0]?.url || ev?.images?.[0]?.url;

const formatDate = (iso?: string) => {
  if (!iso) return undefined;
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
};

const EventDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const initial = (location.state || {}) as StateProps;

  const [data, setData] = useState<TMEvent | undefined>(undefined);
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState<string | null>(null);

  // RELATED state
  const [related, setRelated] = useState<TMEvent[]>([]);
  const [relLoading, setRelLoading] = useState(false);
  const relRef = useRef<HTMLDivElement | null>(null);
  const scrollRel = (dir: "left" | "right") =>
    relRef.current?.scrollBy({
      left: dir === "left" ? -360 : 360,
      behavior: "smooth",
    });
  const onRelWheel = (e: React.WheelEvent) => {
    // convert vertical scroll to horizontal for this row
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      relRef.current?.scrollBy({ left: e.deltaY, behavior: "smooth" });
    }
  };

  // Fetch full event
  useEffect(() => {
    if (!id) return;
    const API_KEY = import.meta.env.VITE_TICKETMASTER_API_KEY;
    if (!API_KEY) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(
          `https://app.ticketmaster.com/discovery/v2/events/${encodeURIComponent(
            id
          )}.json?apikey=${encodeURIComponent(API_KEY)}`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const ev: TMEvent = await res.json();
        setData(ev);
      } catch (e: any) {
        if (e?.name !== "AbortError")
          setError(e?.message || "Failed to load event");
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [id]);

  // Derived view model
  const view = useMemo(() => {
    const title = data?.name || initial.title || "Sample Event Title";
    const date =
      formatDate(
        data?.dates?.start?.dateTime ?? data?.dates?.start?.localDate
      ) ||
      initial.date ||
      "Saturday, October 12, 2025";

    const venue = (() => {
      const v = data?._embedded?.venues?.[0];
      if (v) {
        const city = v.city?.name;
        const st = v.state?.stateCode;
        return [v.name, city && st ? `${city}, ${st}` : city]
          .filter(Boolean)
          .join(", ");
      }
      return initial.venue || "The Forum, Los Angeles, CA";
    })();

    const image =
      pickLargeImage(data) ||
      initial.image ||
      "https://via.placeholder.com/1200x600.png?text=Event+Image";

    const description =
      data?.info ||
      data?.pleaseNote ||
      initial.description ||
      "No description available for this event.";

    const attractionName =
      data?._embedded?.attractions?.[0]?.name || initial.title;
    const attractionId = data?._embedded?.attractions?.[0]?.id;

    return {
      title,
      date,
      venue,
      image,
      description,
      attractionName,
      attractionId,
    };
  }, [data, initial]);

  const buyUrl = data?.url || initial.url;

  // Fetch related
  useEffect(() => {
    const API_KEY = import.meta.env.VITE_TICKETMASTER_API_KEY;
    if (!API_KEY) return;

    const keyword = view.attractionName || view.title;
    if (!keyword) return;

    const controller = new AbortController();
    (async () => {
      try {
        setRelLoading(true);
        const url = view.attractionId
          ? `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${encodeURIComponent(
              API_KEY
            )}&attractionId=${encodeURIComponent(
              view.attractionId
            )}&countryCode=US&size=12&sort=date,asc`
          : `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${encodeURIComponent(
              API_KEY
            )}&keyword=${encodeURIComponent(
              keyword
            )}&countryCode=US&size=12&sort=relevance,desc`;

        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const events: TMEvent[] = json._embedded?.events ?? [];
        const filtered = events.filter((e) => e.id !== id).slice(0, 12);
        setRelated(filtered);
      } catch {
        // soft fail
      } finally {
        setRelLoading(false);
      }
    })();

    return () => controller.abort();
  }, [id, view.attractionId, view.attractionName, view.title]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      {/* Loading / error */}
      {loading && (
        <div className="animate-pulse">
          <div className="h-[360px] w-full bg-gray-200 rounded-2xl mb-8" />
          <div className="h-8 bg-gray-200 w-2/3 mb-4 rounded" />
          <div className="h-4 bg-gray-200 w-1/3 mb-2 rounded" />
          <div className="h-4 bg-gray-200 w-1/4 mb-6 rounded" />
        </div>
      )}
      {error && (
        <div className="p-4 mb-6 rounded-lg bg-red-50 text-red-700">
          {error}
        </div>
      )}

      {!loading && (
        <>
          {/* HERO */}
          <div className="relative h-[420px] md:h-[520px] rounded-2xl overflow-hidden mb-8">
            <img
              src={view.image}
              alt={view.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
              <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-sm">
                {view.title}
              </h1>
              <p className="mt-2 text-white/90">{view.date}</p>
              <p className="text-white/90">{view.venue}</p>
            </div>
          </div>

          {/* ABOUT */}
          <div>
            <h2 className="text-2xl font-semibold mb-2">About this event</h2>
            <p className="text-gray-700 leading-relaxed">{view.description}</p>

            {/* divider + actions */}
            <div className="border-t border-gray-200 mt-6 pt-6">
              <div className="flex justify-between items-center">
                {buyUrl ? (
                  <a
                    href={buyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Buy tickets for ${view.title}`}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M5 6h14a2 2 0 0 1 2 2v1a2 2 0 1 0 0 4v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1a2 2 0 1 0 0-4V8a2 2 0 0 1 2-2Z"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Buy Tickets
                  </a>
                ) : (
                  <span />
                )}

                <button
                  onClick={() => window.history.back()}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M15 18l-6-6 6-6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Back
                </button>
              </div>
            </div>
          </div>

          {/* RELATED — horizontal scroller */}
          {(relLoading || related.length > 0) && (
            <section className="mt-12 relative">
              <h3 className="text-xl font-semibold mb-4">
                {view.attractionName
                  ? `More from ${view.attractionName}`
                  : "Related events"}
              </h3>

              {/* Chevrons (desktop) */}
              <button
                type="button"
                aria-label="Scroll left"
                onClick={() => scrollRel("left")}
                className="hidden md:flex items-center justify-center absolute -left-3 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-blue-600 text-white shadow hover:bg-blue-700 transition"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
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
                onClick={() => scrollRel("right")}
                className="hidden md:flex items-center justify-center absolute -right-3 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-blue-600 text-white shadow hover:bg-blue-700 transition"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9 6l6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {/* Fades (desktop) */}
              <div className="pointer-events-none hidden md:block absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-white to-transparent z-10" />
              <div className="pointer-events-none hidden md:block absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-white to-transparent z-10" />

              {/* Scroller */}
              <div
                ref={relRef}
                onWheel={onRelWheel}
                className="flex gap-5 overflow-x-auto snap-x snap-mandatory pb-2 pr-1 scroll-smooth"
              >
                {relLoading
                  ? [...Array(6)].map((_, i) => (
                      <div
                        key={i}
                        className="snap-start shrink-0 w-[320px] h-[190px] rounded-xl bg-gray-200 animate-pulse"
                      />
                    ))
                  : related.map((ev) => {
                      const img =
                        ev.images
                          ?.filter((i) => i.width >= 800 && i.height >= 450)
                          .sort((a, b) => b.width - a.width)[0]?.url ||
                        ev.images?.[0]?.url;

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
                        <Link
                          key={ev.id ?? ev.url}
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
                          className="snap-start shrink-0 w-[320px] rounded-xl overflow-hidden bg-white shadow hover:shadow-md transition"
                        >
                          {img ? (
                            <img
                              src={img}
                              alt={ev.name}
                              className="h-[150px] w-full object-cover"
                            />
                          ) : (
                            <div className="h-[150px] w-full bg-gray-200" />
                          )}
                          <div className="p-4">
                            <h4 className="font-semibold text-[15px] leading-snug line-clamp-2">
                              {ev.name}
                            </h4>
                            {d && (
                              <p className="text-sm text-gray-500 mt-1">{d}</p>
                            )}
                            {venue && (
                              <p className="text-sm text-gray-500">{venue}</p>
                            )}
                          </div>
                        </Link>
                      );
                    })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};

export default EventDetails;