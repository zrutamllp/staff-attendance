import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const proxy = auth((req) => {
  const request = req as NextRequest & typeof req;
  const isLoggedIn = !!req.auth;
  const isLoginPage = request.nextUrl.pathname.startsWith("/login");

  // #region agent log
  fetch("http://127.0.0.1:7346/ingest/117f8a74-990f-47d2-ad4b-f186f636f3ac", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "d0b585" },
    body: JSON.stringify({
      sessionId: "d0b585",
      hypothesisId: "A",
      location: "proxy.ts:entry",
      message: "proxy auth callback",
      data: {
        pathname: request.nextUrl.pathname,
        requestUrl: request.url,
        isLoggedIn,
        isLoginPage,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  try {
    if (!isLoggedIn && !isLoginPage) {
      const loginUrl = new URL("/login", request.url);
      // #region agent log
      fetch("http://127.0.0.1:7346/ingest/117f8a74-990f-47d2-ad4b-f186f636f3ac", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "d0b585" },
        body: JSON.stringify({
          sessionId: "d0b585",
          hypothesisId: "A",
          location: "proxy.ts:redirect-login",
          message: "redirect to login",
          data: { target: loginUrl.toString() },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      return NextResponse.redirect(loginUrl);
    }

    if (isLoggedIn && isLoginPage) {
      const homeUrl = new URL("/", request.url);
      // #region agent log
      fetch("http://127.0.0.1:7346/ingest/117f8a74-990f-47d2-ad4b-f186f636f3ac", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "d0b585" },
        body: JSON.stringify({
          sessionId: "d0b585",
          hypothesisId: "C",
          location: "proxy.ts:redirect-home",
          message: "redirect to home",
          data: { target: homeUrl.toString() },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      return NextResponse.redirect(homeUrl);
    }

    return NextResponse.next();
  } catch (error) {
    // #region agent log
    fetch("http://127.0.0.1:7346/ingest/117f8a74-990f-47d2-ad4b-f186f636f3ac", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "d0b585" },
      body: JSON.stringify({
        sessionId: "d0b585",
        hypothesisId: "B",
        location: "proxy.ts:error",
        message: "proxy redirect error",
        data: { error: error instanceof Error ? error.message : "unknown" },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    throw error;
  }
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
