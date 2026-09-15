import { describe, it, expect, vi } from "vitest";

// Regression coverage for #39: under Prisma 7, `new PrismaClient()` with no
// driver adapter throws PrismaClientInitializationError at module load, so
// importing src/config/prisma.ts (and therefore src/index.ts) crashed the
// process before it could listen. setup.ts mocks this module globally, so we
// load the real one with importActual. Constructing the client and adapter
// does not open a connection; no database is needed.

describe("Prisma client construction", () => {
  it("builds a PrismaClient with the pg driver adapter without throwing", async () => {
    process.env["DATABASE_URL"] = "postgresql://user:pass@127.0.0.1:5432/never_connected";

    const mod = await vi.importActual<typeof import("../../config/prisma.js")>(
      "../../config/prisma.js"
    );

    expect(mod.prisma).toBeDefined();
    expect(typeof mod.prisma.$connect).toBe("function");
    expect(typeof mod.prisma.$disconnect).toBe("function");
    expect(mod.prisma.user).toBeDefined();
  });
});
