import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { prisma } from "../../config/prisma.js";
import * as invoiceController from "../../controllers/invoice.controller.js";
import { mockUser, mockClient, mockInvoice } from "../fixtures/index.js";

function mockReq(body: Record<string, unknown> = {}, params: Record<string, string> = {}, query: Record<string, string> = {}): Request {
  return {
    body,
    params,
    query,
    headers: {},
    ip: "127.0.0.1",
    socket: { remoteAddress: "127.0.0.1" },
  } as unknown as Request;
}

function mockRes(): Response {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

function withUser(req: Request, userId: string, role: string): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (req as any).user = { userId, role };
}

describe("Invoice Controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createInvoice", () => {
    it("should create an invoice as freelancer", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockClient as never);
      vi.mocked(prisma.invoice.create).mockResolvedValue(mockInvoice as never);

      const req = mockReq({
        recipientId: "clx1234567891",
        title: "Web Development",
        description: "Frontend work",
        amount: 1500,
      });
      withUser(req, "clx1234567890", "FREELANCER");
      const res = mockRes();

      await invoiceController.createInvoice(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ invoice: expect.any(Object) }),
        })
      );
    });

    it("should reject invoice creation by client", async () => {
      const req = mockReq({
        recipientId: "clx1234567890",
        title: "Web Development",
        description: "Frontend work",
        amount: 1500,
      });
      withUser(req, "clx1234567891", "CLIENT");
      const res = mockRes();

      await expect(invoiceController.createInvoice(req, res)).rejects.toThrow("Only freelancers can create invoices");
    });

    it("should reject self-invoice", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);

      const req = mockReq({
        recipientId: "clx1234567890",
        title: "Self Invoice",
        description: "Test",
        amount: 100,
      });
      withUser(req, "clx1234567890", "FREELANCER");
      const res = mockRes();

      await expect(invoiceController.createInvoice(req, res)).rejects.toThrow("Cannot create invoice for yourself");
    });
  });

  describe("getInvoices", () => {
    it("should return paginated invoices for freelancer", async () => {
      vi.mocked(prisma.invoice.findMany).mockResolvedValue([mockInvoice] as never);
      vi.mocked(prisma.invoice.count).mockResolvedValue(1);

      const req = mockReq({}, {}, { page: "1", limit: "20" });
      withUser(req, "clx1234567890", "FREELANCER");
      const res = mockRes();

      await invoiceController.getInvoices(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            invoices: expect.any(Array),
            pagination: expect.objectContaining({
              page: 1,
              limit: 20,
              total: 1,
              totalPages: 1,
            }),
          }),
        })
      );
    });
  });

  describe("getInvoice", () => {
    it("should return invoice by ID for creator", async () => {
      vi.mocked(prisma.invoice.findUnique).mockResolvedValue(mockInvoice as never);

      const req = mockReq({}, { id: "clx_inv_001" });
      withUser(req, "clx1234567890", "FREELANCER");
      const res = mockRes();

      await invoiceController.getInvoice(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ invoice: expect.any(Object) }),
        })
      );
    });

    it("should deny access to non-participant", async () => {
      vi.mocked(prisma.invoice.findUnique).mockResolvedValue(mockInvoice as never);

      const req = mockReq({}, { id: "clx_inv_001" });
      withUser(req, "clx_unauthorized", "FREELANCER");
      const res = mockRes();

      await expect(invoiceController.getInvoice(req, res)).rejects.toThrow("You don't have access to this invoice");
    });
  });

  describe("updateInvoice", () => {
    it("should update invoice title", async () => {
      vi.mocked(prisma.invoice.findUnique).mockResolvedValue(mockInvoice as never);
      vi.mocked(prisma.invoice.update).mockResolvedValue({
        ...mockInvoice,
        title: "Updated Title",
      } as never);

      const req = mockReq({ title: "Updated Title" }, { id: "clx_inv_001" });
      withUser(req, "clx1234567890", "FREELANCER");
      const res = mockRes();

      await invoiceController.updateInvoice(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            invoice: expect.objectContaining({ title: "Updated Title" }),
          }),
        })
      );
    });

    it("should reject update by non-creator", async () => {
      vi.mocked(prisma.invoice.findUnique).mockResolvedValue(mockInvoice as never);

      const req = mockReq({ title: "Hacked" }, { id: "clx_inv_001" });
      withUser(req, "clx1234567891", "CLIENT");
      const res = mockRes();

      await expect(invoiceController.updateInvoice(req, res)).rejects.toThrow("Only the invoice creator can update it");
    });
  });

  describe("deleteInvoice", () => {
    it("should delete draft invoice", async () => {
      vi.mocked(prisma.invoice.findUnique).mockResolvedValue(mockInvoice as never);
      vi.mocked(prisma.invoice.delete).mockResolvedValue(mockInvoice as never);

      const req = mockReq({}, { id: "clx_inv_001" });
      withUser(req, "clx1234567890", "FREELANCER");
      const res = mockRes();

      await invoiceController.deleteInvoice(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { message: "Invoice deleted successfully" },
      });
    });

    it("should reject deleting non-draft invoice", async () => {
      vi.mocked(prisma.invoice.findUnique).mockResolvedValue({
        ...mockInvoice,
        status: "PENDING",
      } as never);

      const req = mockReq({}, { id: "clx_inv_001" });
      withUser(req, "clx1234567890", "FREELANCER");
      const res = mockRes();

      await expect(invoiceController.deleteInvoice(req, res)).rejects.toThrow("Only draft invoices can be deleted");
    });
  });
});
