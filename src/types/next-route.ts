import type { NextRequest } from "next/server";

export type RouteContext<T extends Record<string, string>> = {
  params: Promise<T>;
};

export type ApiRouteHandler<T extends Record<string, string> = Record<string, never>> =
  (request: NextRequest, context: RouteContext<T>) => Promise<Response> | Response;
