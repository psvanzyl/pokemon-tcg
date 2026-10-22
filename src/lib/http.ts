/**
 * JSON-safe route helpers.
 *
 * An unhandled error inside an App Router route handler produces a 500 with an
 * EMPTY body. The browser then fails with
 *   "Failed to execute 'json' on 'Response': Unexpected end of JSON input"
 * which tells the user nothing and hides the real cause from us. Every API route
 * is wrapped in `jsonRoute`, so a crash always returns parseable JSON with a
 * readable message -- and the real error is logged server-side.
 */
import { NextResponse } from "next/server";

export function jsonError(
  e: unknown,
  where: string,
  status = 500,
  message = "Something went wrong on our side. Please try again in a moment.",
): NextResponse {
  console.error(`[carddex:${where}] unhandled error:`, e);
  return NextResponse.json({ error: "server_error", message }, { status });
}

/**
 * Wrap a route handler so any unhandled error becomes a JSON 500 instead of an
 * empty body. `handlers` maps the HTTP method to the implementation.
 */
export function jsonRoute(
  where: string,
  handlers: Partial<Record<"GET" | "POST" | "PUT" | "PATCH" | "DELETE", (req: Request) => Promise<Response>>>,
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    const method = req.method.toUpperCase() as "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    const handler = handlers[method];
    if (!handler) {
      return NextResponse.json({ error: "method_not_allowed" }, { status: 405 });
    }
    try {
      return await handler(req);
    } catch (e) {
      return jsonError(e, `${where}:${method}`);
    }
  };
}
