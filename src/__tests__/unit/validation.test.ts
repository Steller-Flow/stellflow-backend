import { describe, it, expect } from "vitest";
import { registerSchema, loginSchema, refreshTokenSchema } from "../../schemas/auth.schema.js";
import { updateProfileSchema, avatarUploadSchema } from "../../schemas/user.schema.js";
import { createInvoiceSchema, updateInvoiceSchema, listInvoicesSchema } from "../../schemas/invoice.schema.js";
import { createEscrowSchema, fundEscrowSchema, releaseEscrowSchema, refundEscrowSchema } from "../../schemas/escrow.schema.js";

describe("Auth Schemas", () => {
  describe("registerSchema", () => {
    it("should accept valid registration data", () => {
      const data = {
        fullname: "John Doe",
        email: "john@example.com",
        password: "password123",
        role: "FREELANCER" as const,
      };
      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should accept registration with optional fields", () => {
      const data = {
        fullname: "John Doe",
        email: "john@example.com",
        password: "password123",
        role: "CLIENT" as const,
        walletAddress: "GCKFBEIYVYQV6FYNUWZV6MO7VVI7RMUO6ESLO45S73JQ27LHJKR2",
        country: "US",
      };
      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should reject short name", () => {
      const data = {
        fullname: "J",
        email: "john@example.com",
        password: "password123",
        role: "FREELANCER" as const,
      };
      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should reject invalid email", () => {
      const data = {
        fullname: "John Doe",
        email: "not-an-email",
        password: "password123",
        role: "FREELANCER" as const,
      };
      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should reject short password", () => {
      const data = {
        fullname: "John Doe",
        email: "john@example.com",
        password: "1234567",
        role: "FREELANCER" as const,
      };
      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should reject invalid role", () => {
      const data = {
        fullname: "John Doe",
        email: "john@example.com",
        password: "password123",
        role: "ADMIN",
      };
      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe("loginSchema", () => {
    it("should accept valid login data", () => {
      const data = { email: "john@example.com", password: "password123" };
      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should reject empty password", () => {
      const data = { email: "john@example.com", password: "" };
      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should reject invalid email", () => {
      const data = { email: "invalid", password: "password123" };
      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe("refreshTokenSchema", () => {
    it("should accept valid refresh token", () => {
      const result = refreshTokenSchema.safeParse({ refreshToken: "valid-token" });
      expect(result.success).toBe(true);
    });

    it("should reject empty refresh token", () => {
      const result = refreshTokenSchema.safeParse({ refreshToken: "" });
      expect(result.success).toBe(false);
    });
  });
});

describe("User Schemas", () => {
  describe("updateProfileSchema", () => {
    it("should accept valid update data", () => {
      const data = { fullname: "Jane Doe", country: "UK" };
      const result = updateProfileSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should accept empty update", () => {
      const result = updateProfileSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("should reject invalid email format", () => {
      const result = updateProfileSchema.safeParse({ email: "not-email" });
      expect(result.success).toBe(false);
    });

    it("should reject invalid URL for profileImage", () => {
      const result = updateProfileSchema.safeParse({ profileImage: "not-a-url" });
      expect(result.success).toBe(false);
    });
  });

  describe("avatarUploadSchema", () => {
    it("should accept valid URL", () => {
      const result = avatarUploadSchema.safeParse({ profileImage: "https://example.com/avatar.png" });
      expect(result.success).toBe(true);
    });

    it("should reject invalid URL", () => {
      const result = avatarUploadSchema.safeParse({ profileImage: "not-a-url" });
      expect(result.success).toBe(false);
    });
  });
});

describe("Invoice Schemas", () => {
  describe("createInvoiceSchema", () => {
    it("should accept valid invoice data", () => {
      const data = {
        recipientId: "clx123",
        title: "Test Invoice",
        description: "Test description",
        amount: 100,
      };
      const result = createInvoiceSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should reject negative amount", () => {
      const data = {
        recipientId: "clx123",
        title: "Test Invoice",
        description: "Test description",
        amount: -100,
      };
      const result = createInvoiceSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should reject zero amount", () => {
      const data = {
        recipientId: "clx123",
        title: "Test Invoice",
        description: "Test description",
        amount: 0,
      };
      const result = createInvoiceSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should reject missing required fields", () => {
      const result = createInvoiceSchema.safeParse({ title: "Test" });
      expect(result.success).toBe(false);
    });
  });

  describe("updateInvoiceSchema", () => {
    it("should accept partial update", () => {
      const result = updateInvoiceSchema.safeParse({ title: "Updated Title" });
      expect(result.success).toBe(true);
    });

    it("should accept status update", () => {
      const result = updateInvoiceSchema.safeParse({ status: "PENDING" });
      expect(result.success).toBe(true);
    });

    it("should reject invalid status", () => {
      const result = updateInvoiceSchema.safeParse({ status: "INVALID_STATUS" });
      expect(result.success).toBe(false);
    });
  });

  describe("listInvoicesSchema", () => {
    it("should accept valid query params", () => {
      const result = listInvoicesSchema.safeParse({ page: "1", limit: "20" });
      expect(result.success).toBe(true);
    });

    it("should accept empty query", () => {
      const result = listInvoicesSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });
});

describe("Escrow Schemas", () => {
  describe("createEscrowSchema", () => {
    it("should accept valid escrow data", () => {
      const data = { invoiceId: "clx123", contractId: "contract_123" };
      const result = createEscrowSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should reject missing invoiceId", () => {
      const result = createEscrowSchema.safeParse({ contractId: "contract_123" });
      expect(result.success).toBe(false);
    });
  });

  describe("fundEscrowSchema", () => {
    it("should accept valid txHash", () => {
      const result = fundEscrowSchema.safeParse({ txHash: "tx_abc123" });
      expect(result.success).toBe(true);
    });

    it("should reject empty txHash", () => {
      const result = fundEscrowSchema.safeParse({ txHash: "" });
      expect(result.success).toBe(false);
    });
  });

  describe("releaseEscrowSchema", () => {
    it("should accept valid txHash", () => {
      const result = releaseEscrowSchema.safeParse({ txHash: "tx_abc123" });
      expect(result.success).toBe(true);
    });
  });

  describe("refundEscrowSchema", () => {
    it("should accept valid txHash", () => {
      const result = refundEscrowSchema.safeParse({ txHash: "tx_abc123" });
      expect(result.success).toBe(true);
    });
  });
});
