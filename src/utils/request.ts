import type { Request } from "express";

/**
 * Replace `req.query` (or `req.body` / `req.params`) with a new value.
 *
 * Express 5 defines `req.query` as a prototype getter with no setter that
 * re-parses the URL on every access, so both `req.query = x` (throws in
 * strict mode) and `Object.assign(req.query, x)` (lost on the next read) are
 * ineffective. Defining an own data property on the request instance shadows
 * the getter; subsequent reads return the stored object and later in-place
 * mutation persists. `body` and `params` are plain properties, but using the
 * same path for all three keeps the middleware uniform.
 */
export function setRequestProperty(
  req: Request,
  key: "body" | "query" | "params",
  value: unknown
): void {
  Object.defineProperty(req, key, {
    value,
    writable: true,
    configurable: true,
    enumerable: true,
  });
}
