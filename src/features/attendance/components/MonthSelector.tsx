"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function MonthSelector({ year, month, onChange }) {
  const [showPicker, setShowPicker] = useState(false);

  function prevMonth() {
    if (month === 1) onChange(year - 1, 12);
    else onChange(year, month - 1);
  }

  function nextMonth() {
    if (month === 12) onChange(year + 1, 1);
    else onChange(year, month + 1);
  }

  return (
    <div className="relative">
      <div className="flex items-center justify-between rounded-2xl bg-surface px-2 py-2">
        <button
          onClick={prevMonth}
          className="rounded-xl p-2 hover:bg-surface-elevated"
          aria-label="Previous month"
        >
          <ChevronLeft size={20} />
        </button>

        <button
          onClick={() => setShowPicker(!showPicker)}
          className="rounded-xl px-4 py-2 text-sm font-semibold hover:bg-surface-elevated"
        >
          {MONTHS[month - 1]} {year}
        </button>

        <button
          onClick={nextMonth}
          className="rounded-xl p-2 hover:bg-surface-elevated"
          aria-label="Next month"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {showPicker && (
        <div className="absolute left-0 right-0 top-full z-20 mt-2 rounded-2xl border border-stone-200 bg-surface-elevated p-4 shadow-lg">
          <div className="grid grid-cols-3 gap-2">
            {MONTHS.map((m, i) => (
              <button
                key={m}
                onClick={() => {
                  onChange(year, i + 1);
                  setShowPicker(false);
                }}
                className={`rounded-xl px-2 py-2 text-xs font-medium ${
                  i + 1 === month ? "bg-charcoal text-white" : "hover:bg-surface"
                }`}
              >
                {m.slice(0, 3)}
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-center gap-4">
            <button
              onClick={() => onChange(year - 1, month)}
              className="rounded-xl px-3 py-1 text-sm hover:bg-surface"
            >
              {year - 1}
            </button>
            <span className="text-sm font-semibold">{year}</span>
            <button
              onClick={() => onChange(year + 1, month)}
              className="rounded-xl px-3 py-1 text-sm hover:bg-surface"
            >
              {year + 1}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function DayStrip({ year, month, selectedDay, onSelectDay }) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
  const todayDay = isCurrentMonth ? today.getDate() : null;
  const selectedRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [year, month, selectedDay]);

  return (
    <div className="flex gap-2 overflow-x-auto scroll-smooth pb-2">
      {Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const isSelected = day === selectedDay;
        const isToday = day === todayDay;

        return (
          <button
            key={day}
            ref={isSelected ? selectedRef : undefined}
            onClick={() => onSelectDay(day)}
            className={`flex shrink-0 flex-col items-center rounded-2xl px-3 py-2 text-xs transition ${
              isSelected
                ? "bg-charcoal text-white"
                : isToday
                  ? "bg-surface ring-2 ring-charcoal"
                  : "bg-surface-elevated hover:bg-surface"
            }`}
          >
            <span className="font-mono text-[10px] uppercase opacity-70">
              {new Date(year, month - 1, day)
                .toLocaleDateString("en", { weekday: "short" })
                .slice(0, 2)}
            </span>
            <span className="mt-0.5 font-semibold">{day}</span>
          </button>
        );
      })}
    </div>
  );
}
