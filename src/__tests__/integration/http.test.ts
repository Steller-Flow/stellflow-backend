import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { createServer, type Server } from "http";
import type { AddressInfo } from "net";
import jwt from "jsonwebtoken";

// Set before anything imports src/config, which reads env at module load.
process.env["JWT_SECRET"] = "http-test-access-secret";
process.env["JWT_REFRESH_SECRET"] = "http-test-refresh-secret";
process.env["NODE_ENV"] = "test";

// These tests go through the real Express app — global middleware, routers,
// validation, error handler — rather than calling controllers directly.
// Regression coverage for #40: sanitizeQuery/validate assigning to the
// getter-only req.query in Express 5 made every request 500.

let server: Server;
let baseUrl: string;

interface ApiBody {
  success: boolean;
  data?: Record<string, unknown> & { pagination?: Record<string, unknown>; user?: Record<string, unknown>; accessToken?: string };
  error?: { message?: string; code?: string; errors?: Record<string, string[]> };
  status?: string;
}

async function json(res: Response): Promise<ApiBody> {
  return (await res.json()) as ApiBody;
}

function token(payload = { userId: "user_1", email: "u@example.com", role: "FREELANCER" }) {
  return jwt.sign(payload, process.env["JWT_SECRET"]!, { expiresIn: 60 });
}

beforeAll(async () => {
  const { default: app } = await import("../../app.js");
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve()))
  );
});

describe("HTTP stack", () => {
  describe("GET /health", () => {
    it("returns 200 with no query string", async () => {
      const res = await fetch(`${baseUrl}/health`);
      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body.status).toBe("ok");
    });

    it("returns 200 with a query string (sanitizeQuery runs on every request)", async () => {
      const res = await fetch(`${baseUrl}/health?probe=1&x=<b>y</b>`);
      expect(res.status).toBe(200);
    });
  });

  describe("GET /api/payments (authenticate + validate(query))", () => {
    it("returns 401 without a bearer token", async () => {
      const res = await fetch(`${baseUrl}/api/payments`);
      expect(res.status).toBe(401);
      const body = await json(res);
      expect(body).toEqual({
        success: false,
        error: { message: "Missing or invalid authorization header", code: "UNAUTHORIZED" },
      });
    });

    it("passes the validated query through to the controller", async () => {
      const { prisma } = await import("../../config/prisma.js");
      vi.mocked(prisma.payment.findMany).mockResolvedValueOnce([]);
      vi.mocked(prisma.payment.count).mockResolvedValueOnce(0);

      const res = await fetch(`${baseUrl}/api/payments?page=2&limit=5`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body.success).toBe(true);
      // page/limit only reach the controller if validate() managed to store
      // the parsed query on the request.
      expect(body.data?.pagination).toMatchObject({ page: 2, limit: 5, total: 0 });
      expect(prisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 5, take: 5 })
      );
    });

    it("rejects an invalid query value with 400 rather than 500", async () => {
      const res = await fetch(`${baseUrl}/api/payments?status=NOPE`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      expect(res.status).toBe(400);
      const body = await json(res);
      expect(body.success).toBe(false);
      expect(body.error?.errors).toHaveProperty("status");
    });
  });

  describe("sanitizeBody + validate(body)", () => {
    it("strips HTML from the JSON body before the controller sees it", async () => {
      const { prisma } = await import("../../config/prisma.js");
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);
      vi.mocked(prisma.user.create).mockImplementationOnce(((args: { data: { fullname: string; email: string; role: string } }) =>
        Promise.resolve({
          id: "user_new",
          fullname: args.data.fullname,
          email: args.data.email,
          role: args.data.role,
          walletAddress: null,
          country: null,
          isVerified: false,
          createdAt: new Date(),
        })) as never);

      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullname: "<script>alert(1)</script>Ada",
          email: "ada@example.com",
          password: "correct-horse-battery",
          role: "FREELANCER",
        }),
      });
      expect(res.status).toBe(201);
      const body = await json(res);
      expect(body.data?.user?.["fullname"]).toBe("Ada");
      expect(typeof body.data?.accessToken).toBe("string");
    });

    it("returns 400 with field errors for an invalid body", async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "not-an-email" }),
      });
      expect(res.status).toBe(400);
      const body = await json(res);
      expect(body.error?.errors).toMatchObject({
        email: expect.any(Array),
        password: expect.any(Array),
      });
    });
  });

  describe("routing", () => {
    it("serves the OpenAPI spec", async () => {
      const res = await fetch(`${baseUrl}/api-docs.json`);
      expect(res.status).toBe(200);
      const spec = (await res.json()) as { openapi: string; paths: Record<string, unknown> };
      expect(spec.openapi).toBe("3.0.0");
      expect(Object.keys(spec.paths).length).toBeGreaterThanOrEqual(34);
    });

    it("returns 404 for an unknown route", async () => {
      const res = await fetch(`${baseUrl}/api/does-not-exist`);
      expect(res.status).toBe(404);
    });
  });
});
