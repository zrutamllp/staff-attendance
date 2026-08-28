export function getErrorMessage(
  err: unknown,
  fallback = "Something went wrong"
): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return fallback;
}
