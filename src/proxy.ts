import { NextResponse, type NextRequest } from "next/server";
import { isAuthorized } from "./lib/basicAuth";

// Password-protects the whole app, so strangers can't create deals or send invoices.
// PayPal's webhook must stay public, so it is skipped (it has its own signature check).
export function proxy(request: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password) return NextResponse.next(); // no password set: open (local development)

  if (isAuthorized(request.headers.get("authorization"), password)) return NextResponse.next();

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Dealflow"' },
  });
}

export const config = {
  matcher: ["/((?!api/paypal/webhook|_next/static|_next/image|favicon.ico).*)"],
};