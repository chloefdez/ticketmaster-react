import React from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

const SearchBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();

  const isSearchPage = location.pathname === "/search";
  const [city, setCity] = React.useState(
    isSearchPage ? params.get("city") ?? "" : ""
  );
  const [dates, setDates] = React.useState(
    isSearchPage ? params.get("dates") ?? "" : ""
  );
  const [query, setQuery] = React.useState(
    isSearchPage ? params.get("q") ?? "" : ""
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    const c = city.trim();
    const d = dates.trim();

    if (!q && !c && !d) return; // nothing to search

    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (c) p.set("city", c);
    if (d) p.set("dates", d);
    p.set("page", "0");

    navigate(`/search?${p.toString()}`);
  };

  return (
    <section className="bg-[#0266df] h-28 flex items-center">
      <div className="flex w-full justify-center">
        <form
          className="w-full max-w-[980px] px-4"
          onSubmit={onSubmit}
          role="search"
          aria-label="Search events"
        >
          {/* One white bar with a fixed right spacer column for perfect balance */}
          <div className="grid grid-cols-[260px_240px_1fr_auto_16px] rounded-md bg-white shadow-sm border border-gray-300 h-[56px]">
            {/* LOCATION */}
            <div className="grid grid-cols-[40px_1fr] border-r border-gray-200 h-full">
              <div className="flex items-center justify-center text-[#0266d1] text-xl h-full">
                <i className="fa-solid fa-location-dot" aria-hidden="true" />
              </div>
              <div className="flex flex-col justify-center h-full pr-3">
                <label
                  htmlFor="cityInput"
                  className="text-[10px] uppercase tracking-wide font-semibold text-gray-900 pl-1"
                >
                  Location
                </label>
                <input
                  id="cityInput"
                  type="text"
                  placeholder="City or Zip Code"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full outline-none border-none placeholder:text-gray-500 pl-1 text-sm"
                />
              </div>
            </div>

            {/* DATES (simple text for now) */}
            <div className="grid grid-cols-[40px_1fr] border-r border-gray-200 h-full">
              <div className="flex items-center justify-center text-[#0266d1] text-xl h-full">
                <i className="fa-solid fa-calendar-days" aria-hidden="true" />
              </div>
              <div className="flex flex-col justify-center h-full pr-3">
                <label
                  htmlFor="dateInput"
                  className="text-[10px] uppercase tracking-wide font-semibold text-gray-900 pl-1"
                >
                  Dates
                </label>
                <div className="flex items-center gap-2 pl-1">
                  <input
                    id="dateInput"
                    type="text"
                    placeholder="All Dates"
                    value={dates}
                    onChange={(e) => setDates(e.target.value)}
                    className="w-full outline-none border-none placeholder:text-gray-500 text-sm"
                  />
                  <i
                    className="fa-solid fa-chevron-down text-gray-400 text-sm"
                    aria-hidden="true"
                  />
                </div>
              </div>
            </div>

            {/* SEARCH FIELD + INSET BUTTON */}
            <div className="grid grid-cols-[40px_1fr_auto] h-full">
              {/* icon */}
              <div className="flex items-center justify-center text-[#0266d1] text-xl h-full">
                <i
                  className="fa-solid fa-magnifying-glass"
                  aria-hidden="true"
                />
              </div>

              {/* label + input */}
              <div className="flex flex-col justify-center h-full pr-3">
                <label
                  htmlFor="searchInput"
                  className="text-[10px] uppercase tracking-wide font-semibold text-gray-900 pl-1"
                >
                  Search
                </label>
                <input
                  id="searchInput"
                  type="text"
                  placeholder="Artist, Event or Venue"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full outline-none border-none placeholder:text-gray-500 pl-1 text-sm"
                />
              </div>

              {/* button cell */}
              <div className="flex items-center justify-end pl-3">
                <div className="bg-white rounded-md p-[3px]">
                  <button
                    type="submit"
                    className="h-10 px-8 min-w-[92px] shrink-0 rounded-md
                               bg-[#0266df] text-white font-semibold
                               hover:bg-[#0059c8] focus:outline-none
                               focus-visible:ring-2 focus-visible:ring-[#0266d1]"
                  >
                    Search
                  </button>
                </div>
              </div>
            </div>

            {/* fixed right spacer (exact 16px) for perfectly even gutter */}
            <div aria-hidden="true" />
          </div>
        </form>
      </div>
    </section>
  );
};

export default SearchBar;