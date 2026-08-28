export const AUTO_PRESENT_TIMEZONE =
  process.env.AUTO_PRESENT_TIMEZONE || "Asia/Kolkata";

export const AUTO_PRESENT_HOUR = parseInt(process.env.AUTO_PRESENT_HOUR || "10", 10);

/** YYYY-MM-DD in the configured timezone. */
export function getLocalDateString(
  date: Date = new Date(),
  timeZone: string = AUTO_PRESENT_TIMEZONE
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Hour (0–23) in the configured timezone. */
export function getLocalHour(
  date: Date = new Date(),
  timeZone: string = AUTO_PRESENT_TIMEZONE
): number {
  const hour = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "numeric",
    hour12: false,
  }).format(date);
  return parseInt(hour, 10);
}

export function isBeforeAutoPresentTime(
  date: Date = new Date(),
  timeZone: string = AUTO_PRESENT_TIMEZONE
): boolean {
  return getLocalHour(date, timeZone) < AUTO_PRESENT_HOUR;
}

export function resolveReferenceDate(referenceDate?: Date | string): Date {
  if (!referenceDate) return new Date();
  if (referenceDate instanceof Date) return referenceDate;
  if (typeof referenceDate === "string" && referenceDate.length === 10) {
    return new Date(`${referenceDate}T12:00:00`);
  }
  return new Date(referenceDate);
}

export function getTodayString(referenceDate?: Date | string): string {
  return getLocalDateString(resolveReferenceDate(referenceDate));
}

export function isFutureDate(dateStr: string, referenceDate?: Date | string): boolean {
  if (!dateStr) return false;
  return dateStr > getTodayString(referenceDate);
}
