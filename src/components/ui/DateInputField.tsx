"use client";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function parseDate(value: string | undefined) {
  if (!value) {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
    };
  }

  const [year, month, day] = value.split("-").map(Number);
  return {
    year: year || new Date().getFullYear(),
    month: month || 1,
    day: day || 1,
  };
}

function toDateString(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

interface DateInputFieldProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  id?: string;
}

export default function DateInputField({
  value,
  onChange,
  label,
  id,
}: DateInputFieldProps) {
  const { year, month, day } = parseDate(value);
  const daysInMonth = new Date(year, month, 0).getDate();
  const safeDay = Math.min(day, daysInMonth);

  function update(nextYear: number, nextMonth: number, nextDay: number) {
    const dim = new Date(nextYear, nextMonth, 0).getDate();
    const clampedDay = Math.min(nextDay, dim);
    onChange(toDateString(nextYear, nextMonth, clampedDay));
  }

  const yearOptions = Array.from({ length: 6 }, (_, i) => year - 2 + i);

  return (
    <div>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-xs text-muted">
          {label}
        </label>
      )}
      <div className="grid grid-cols-3 gap-2">
        <select
          id={id}
          value={safeDay}
          onChange={(e) => update(year, month, parseInt(e.target.value, 10))}
          className="input-field"
          aria-label="Day"
        >
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select
          value={month}
          onChange={(e) => update(year, parseInt(e.target.value, 10), safeDay)}
          className="input-field"
          aria-label="Month"
        >
          {MONTHS.map((name, i) => (
            <option key={name} value={i + 1}>
              {name}
            </option>
          ))}
        </select>
        <select
          value={year}
          onChange={(e) => update(parseInt(e.target.value, 10), month, safeDay)}
          className="input-field"
          aria-label="Year"
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
