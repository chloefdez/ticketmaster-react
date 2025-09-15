import React, { useMemo, useRef, useState } from "react";
import { useNavigate, createSearchParams } from "react-router-dom";

import { DayPicker } from "react-day-picker";
import type { DateRange } from "react-day-picker";
import "react-day-picker/dist/style.css";

import {
  format,
  startOfToday,
  endOfToday,
  nextSaturday,
  nextSunday,
  addDays,
  startOfMonth,
  endOfMonth,
} from "date-fns";

const SearchBar: React.FC = () => {
  const navigate = useNavigate();

  // ----- form state
  const [city, setCity] = useState("");
  const [keyword, setKeyword] = useState("");

  // ----- date picker state
  const [isOpen, setIsOpen] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>(undefined);
  const anchorRef = useRef<HTMLDivElement | null>(null);

  // label shown in the Dates input
  const datesLabel = useMemo(() => {
    if (!range?.from) return "All Dates";
    const from = format(range.from, "yyyy-MM-dd");
    const to = format(range.to ?? range.from, "yyyy-MM-dd");
    return `${from} to ${to}`;
  }, [range]);

  // quick pick configs
  const quickPicks = [
    {
      label: "Today",
      get: () => {
        const t = startOfToday();
        return { from: t, to: endOfToday() };
      },
    },
    {
      label: "This Weekend",
      get: () => {
        const sat = nextSaturday(startOfToday());
        const sun = nextSunday(startOfToday());
        return { from: sat, to: sun };
      },
    },
    {
      label: "Next 7 Days",
      get: () => {
        const t = startOfToday();
        return { from: t, to: addDays(t, 6) }; // inclusive 7-day window
      },
    },
    {
      label: "This Month",
      get: () => ({
        from: startOfMonth(startOfToday()),
        to: endOfMonth(startOfToday()),
      }),
    },
  ];

  // ---- submit handler (used by form submit + “Apply” button)
  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const params: Record<string, string> = {};

    const c = city.trim();
    const q = keyword.trim();
    if (c) params.city = c;
    if (q) params.q = q;

    if (range?.from) {
      params.from = format(range.from, "yyyy-MM-dd");
      params.to = format(range.to ?? range.from, "yyyy-MM-dd");
    }

    navigate({
      pathname: "/search",
      search: `?${createSearchParams(params)}`,
    });
  };

  return (
    <section className="bg-[#0266df] h-28 flex items-center">
      <div className="flex w-full justify-center">
        <form className="w-full max-w-[980px] px-4" onSubmit={handleSubmit}>
          {/* One white bar with a fixed right spacer column for perfect balance */}
          <div className="relative grid grid-cols-[260px_240px_1fr_auto_16px] rounded-md bg-white shadow-sm border border-gray-300 h-[56px]">
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
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City or Zip Code"
                  className="w-full outline-none border-none placeholder:text-gray-500 pl-1 text-sm"
                />
              </div>
            </div>

            {/* DATES */}
            <div className="grid grid-cols-[40px_1fr] border-r border-gray-200 h-full">
              <div className="flex items-center justify-center text-[#0266d1] text-xl h-full">
                <i className="fa-solid fa-calendar-days" aria-hidden="true" />
              </div>

              {/* anchor wraps the clickable field + popover */}
              <div
                ref={anchorRef}
                className="relative flex flex-col justify-center h-full pr-3"
              >
                <span className="text-[10px] uppercase tracking-wide font-semibold text-gray-900 pl-1">
                  Dates
                </span>

                {/* pseudo input to open the picker */}
                <button
                  type="button"
                  onClick={() => setIsOpen((s) => !s)}
                  className="w-full flex items-center justify-between text-left pl-1 text-sm text-gray-800"
                >
                  <span className="truncate">{datesLabel}</span>
                  <i
                    className="fa-solid fa-chevron-down text-gray-400 text-xs ml-2"
                    aria-hidden="true"
                  />
                </button>

                {/* calendar popover */}
                {isOpen && (
                  <div
                    className="
                      absolute z-50 top-[60px] left-1/2 -translate-x-1/2
                      w-auto min-w-[280px] rounded-2xl bg-white shadow-xl
                      border border-gray-200 p-3
                    "
                  >
                    {/* quick picks (full width) */}
                    <div className="flex items-center justify-between pb-2 border-b mb-2">
                      <div className="flex flex-nowrap gap-1.5 overflow-x-auto no-scrollbar pr-1">
                        {quickPicks.map((p) => (
                          <button
                            key={p.label}
                            type="button"
                            onClick={() => setRange(p.get())}
                            className="
                              inline-flex items-center justify-center
                              h-7 px-2.5 rounded-full
                              border border-gray-300 bg-white
                              text-[11px] leading-none font-medium
                              hover:bg-gray-50 active:bg-gray-100
                              focus:outline-none focus:ring-2 focus:ring-[#0266df]/30
                              whitespace-nowrap
                            "
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => setRange(undefined)}
                        className="
                          shrink-0 inline-flex items-center justify-center
                          h-7 px-2.5 rounded-full
                          border border-transparent hover:border-gray-300
                          text-[11px] leading-none font-medium
                          hover:bg-gray-50
                          whitespace-nowrap
                        "
                      >
                        Clear
                      </button>
                    </div>

                    {/* calendar centered under quick picks */}
                    <div className="flex justify-center">
                      <DayPicker
                        mode="range"
                        numberOfMonths={1}
                        selected={range}
                        onSelect={setRange}
                        weekStartsOn={0}
                        showOutsideDays={false}
                        className="rdp !p-0 [--rdp-cell-size:2.25rem]"
                      />
                    </div>

                    {/* actions */}
                    <div className="mt-3 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium"
                      >
                        Close
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsOpen(false);
                          handleSubmit();
                        }}
                        className="px-4 py-2 rounded-lg bg-[#0266df] text-white text-sm font-semibold hover:bg-[#0059c8]"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* SEARCH FIELD + SUBMIT BUTTON */}
            <div className="grid grid-cols-[40px_1fr_auto] h-full">
              {/* icon */}
              <div className="flex items-center justify-center text-[#0266d1] text-xl h-full">
                <i
                  className="fa-solid fa-magnifying-glass"
                  aria-hidden="true"
                />
              </div>

              {/* input */}
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
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Artist, Event or Venue"
                  className="w-full outline-none border-none placeholder:text-gray-500 pl-1 text-sm"
                />
              </div>

              {/* submit button cell */}
              <div className="flex items-center justify-end pl-3">
                {/* white frame keeps outline clean */}
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