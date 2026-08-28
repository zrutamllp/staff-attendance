export function normalizePhone(phone: string | number): string {
  return String(phone).replace(/\D/g, "");
}

export function isValidPhone(phone: string | number): boolean {
  const digits = normalizePhone(phone);
  return digits.length >= 10 && digits.length <= 15;
}

export function formatPhone(phone: string | number): string {
  const digits = normalizePhone(phone);
  if (digits.length === 10) {
    return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return digits;
}
