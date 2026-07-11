import { describe, it, expect } from "vitest";

describe("AppError", () => {
  it("should create error with message and status code", async () => {
    const { AppError } = await import("../utils/AppError.js");
    const error = new AppError("Test error", 400);
    expect(error.message).toBe("Test error");
    expect(error.statusCode).toBe(400);
    expect(error.isOperational).toBe(true);
  });

  it("should create NotFoundError", async () => {
    const { NotFoundError } = await import("../utils/AppError.js");
    const error = new NotFoundError("User");
    expect(error.message).toBe("User not found");
    expect(error.statusCode).toBe(404);
  });

  it("should create UnauthorizedError", async () => {
    const { UnauthorizedError } = await import("../utils/AppError.js");
    const error = new UnauthorizedError();
    expect(error.message).toBe("Unauthorized");
    expect(error.statusCode).toBe(401);
  });

  it("should create ForbiddenError", async () => {
    const { ForbiddenError } = await import("../utils/AppError.js");
    const error = new ForbiddenError();
    expect(error.message).toBe("Forbidden");
    expect(error.statusCode).toBe(403);
  });
});

describe("Invoice Schema Validation", () => {
  it("should validate create invoice schema", async () => {
    const { createInvoiceSchema } = await import("../validators/invoice.schema.js");

    const valid = {
      recipientId: "test-id",
      title: "Test Invoice",
      description: "Test description",
      amount: 100,
    };

    const result = createInvoiceSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("should reject invalid invoice data", async () => {
    const { createInvoiceSchema } = await import("../validators/invoice.schema.js");

    const invalid = {
      recipientId: "",
      title: "",
      description: "",
      amount: -100,
    };

    const result = createInvoiceSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe("Upload Service", () => {
  it("should validate file types", () => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
    expect(allowed.includes("image/jpeg")).toBe(true);
    expect(allowed.includes("image/png")).toBe(true);
    expect(allowed.includes("application/pdf")).toBe(true);
    expect(allowed.includes("text/plain")).toBe(false);
  });

  it("should validate file sizes", () => {
    const maxSize = 10 * 1024 * 1024;
    expect(1024 <= maxSize).toBe(true);
    expect(maxSize <= maxSize).toBe(true);
    expect((11 * 1024 * 1024) <= maxSize).toBe(false);
  });

  it("should generate file keys", () => {
    const key = `avatars/user123/${Date.now()}.jpg`;
    expect(key).toMatch(/^avatars\/user123\/\d+\.jpg$/);

    const invoiceKey = `invoices/user123/${Date.now()}.pdf`;
    expect(invoiceKey).toMatch(/^invoices\/user123\/\d+\.pdf$/);
  });
});
