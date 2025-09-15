import React, { useEffect, useState } from "react";

type TMEvent = {
  name: string;
  url: string;
  images: { url: string; width: number; height: number }[];
  dates?: {
    start?: {
      localDate?: string;
      localTime?: string;
    };
  };
  _embedded?: {
    venues?: {
      name?: string;
      city?: { name?: string };
      state?: { stateCode?: string };
    }[];
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
        await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt))); // 0.5s, 1s
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

const HeroFeaturedEvent: React.FC = () => {
  const [event, setEvent] = useState<TMEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const API_KEY = import.meta.env.VITE_TICKETMASTER_API_KEY;
    if (!API_KEY) {
      setError(
        "Missing Ticketmaster API key (.env.local = VITE_TICKETMASTER_API_KEY)"
      );
      setLoading(false);
      return;
    }

    const page = Math.floor(Math.random() * 5);

    const url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${encodeURIComponent(
      API_KEY
    )}&countryCode=US&size=200&sort=relevance,desc&page=${page}&locale=*`;

    const controller = new AbortController();

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetchWithRetry(url, { signal: controller.signal });

        const data = await res.json();
        const events: TMEvent[] = data._embedded?.events ?? [];

        if (!events.length) {
          setError("No events found.");
          return;
        }

        const [choice] = shuffleInPlace(events.slice());
        setEvent(choice);
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
    }

    load();
    return () => controller.abort();
  }, []);

  if (loading) {
    return (
      <section className="relative h-[52vh] md:h-[62vh] bg-gray-200 flex items-end">
        <div className="absolute inset-0 animate-pulse bg-gray-300" />
        <div className="relative z-[1] w-full max-w-[1200px] mx-auto px-5 pb-8">
          <div className="h-8 w-3/5 bg-white/70 rounded" />
          <div className="mt-3 h-5 w-2/5 bg-white/60 rounded" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="h-[36vh] md:h-[48vh] flex items-center justify-center">
        <p className="text-red-600 font-medium">Error: {error}</p>
      </section>
    );
  }

  if (!event) return null;

  // -------- Location + Date Line --------
  const venue = event._embedded?.venues?.[0];
  const venueName = venue?.name;
  const city = venue?.city?.name;
  const stateCode = venue?.state?.stateCode;

  const rawDate = event.dates?.start?.localDate;
  const rawTime = event.dates?.start?.localTime;

  let dateFormatted: string | null = null;
  if (rawDate) {
    const dt = new Date(`${rawDate}T${rawTime || "00:00:00"}`);
    dateFormatted = dt.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  const cityState = [city, stateCode].filter(Boolean).join(", ");
  const locationLine = [dateFormatted, venueName, cityState]
    .filter(Boolean)
    .join("  • ");

  // -------- Hero Image --------
  const img =
    event.images
      ?.filter((i) => i.width >= 1200 && i.height >= 600)
      .sort((a, b) => b.width - a.width)[0]?.url || event.images?.[0]?.url;

  // -------- Render --------
  return (
    <section className="relative h-[52vh] md:h-[62vh] bg-gray-200 overflow-hidden">
      {img ? (
        <img
          src={img}
          alt={event.name}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ aspectRatio: "16 / 9" }}
          loading="lazy"
          decoding="async"
          fetchPriority="high"
        />
      ) : (
        <div className="absolute inset-0 bg-gray-200" />
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent z-0" />

      {/* Content */}
      <div className="absolute bottom-8 md:bottom-10 left-6 right-6 md:left-12 md:right-12">
        <div className="relative z-[1] max-w-[1200px] text-white">
          {/* Title */}
          <h1 className="text-3xl md:text-5xl font-medium leading-tight">
            {event.name}
          </h1>

          {/* Meta (date • venue • city) */}
          <p className="mt-2 md:mt-3 mb-6 md:mb-8 text-[15px] md:text-[17px] font-normal text-white/90 leading-relaxed">
            {locationLine}
          </p>

          <a
            href={event.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition w-[120px] h-[48px]"
          >
            Find Tickets
          </a>
        </div>
      </div>
    </section>
  );
};

export default HeroFeaturedEvent;