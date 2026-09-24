import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAuthorizedHeader } from "@/app/lib/admin-auth";

export function proxy(request: NextRequest) {
  if (isAuthorizedHeader(request.headers.get("authorization"))) {
    return NextResponse.next();
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Admin"',
    },
  });
}

export const config = {
  matcher: "/admin/:path*",
};
