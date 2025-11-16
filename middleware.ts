import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function decodeJwt(token: string) {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64").toString()
    );
    return payload;
  } catch {
    return null;
  }
}

export default function middleware(req: NextRequest) {
  const token = req.cookies.get("access_token")?.value;
  console.log(token)
  if (!token) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const payload = decodeJwt(token);
  console.log(payload)
  if (!payload) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const pathname = req.nextUrl.pathname;

  // ADMIN
  if (pathname.startsWith("/admin") && !payload.is_admin) {
    return NextResponse.redirect(new URL("/usuario", req.url));
  }

  // USER NORMAL
  if (pathname.startsWith("/usuario") && payload.is_admin) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/usuario/:path*"],
};
