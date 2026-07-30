import { NextResponse, type NextRequest } from "next/server";
import {
  GATE_COOKIE,
  gatePassword,
  gateToken,
  safeEqual,
} from "@/lib/gate/access";

/**
 * Gates the whole site behind one shared password when `DEMO_ACCESS_PASSWORD` is set.
 *
 * A no-op when it is unset, so `npm run dev` and both test suites are unaffected.
 * See src/lib/gate/access.ts for why this exists and what it is not.
 *
 * Lives in `src/proxy.ts` and is named `proxy`: Next 16 deprecated the older
 * `middleware` file convention in favour of this one.
 */
export async function proxy(request: NextRequest) {
  const password = gatePassword();
  if (!password) return NextResponse.next();

  const { pathname, search } = request.nextUrl;

  // The unlock screen itself must stay reachable, or there is no way in.
  if (pathname === "/unlock") return NextResponse.next();

  const presented = request.cookies.get(GATE_COOKIE)?.value;
  if (presented && safeEqual(presented, await gateToken(password))) {
    return NextResponse.next();
  }

  const unlock = request.nextUrl.clone();
  unlock.pathname = "/unlock";
  unlock.search = "";
  // Remember where they were headed so unlocking lands them there.
  unlock.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(unlock);
}

export const config = {
  /**
   * Everything except Next's own assets and the metadata files a browser or crawler
   * fetches unauthenticated. Server actions are *not* excluded — they post to a page
   * route and must be gated too.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
