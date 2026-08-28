import { ZodSchema } from "zod";
import { ValidationError } from "@/lib/api-auth";

export function parseBody<T>(schema: ZodSchema<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    const message = result.error.issues.map((i) => i.message).join("; ");
    throw new ValidationError(message || "Invalid request body");
  }
  return result.data;
}

export function parseQuery<T>(
  schema: ZodSchema<T>,
  params: Record<string, string | null>
): T {
  const result = schema.safeParse(params);
  if (!result.success) {
    const message = result.error.issues.map((i) => i.message).join("; ");
    throw new ValidationError(message || "Invalid query parameters");
  }
  return result.data;
}
