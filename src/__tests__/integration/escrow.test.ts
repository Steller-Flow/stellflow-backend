import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { prisma } from "../../config/prisma.js";
import * as stellarService from "../../services/stellar.service.js";
import * as escrowController from "../../controllers/escrow.controller.js";
import { mockInvoice, mockEscrow } from "../fixtures/index.js";

function mockReq(body: Record<string, unknown> = {}, params: Record<string, string> = {}): Request {
  return {
    body,
    params,
    query: {},
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

describe("Escrow Controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createEscrow", () => {
    it("should create escrow as client", async () => {
      vi.mocked(prisma.invoice.findUnique).mockResolvedValue({
        ...mockInvoice,
        status: "PENDING",
      } as never);
      vi.mocked(prisma.escrow.findUnique).mockResolvedValue(null);
      vi.mocked(stellarService.createEscrowContract).mockResolvedValue({
        success: true,
        txHash: "tx_123",
        contractId: "contract_123",
      });
      vi.mocked(prisma.escrow.create).mockResolvedValue(mockEscrow as never);
      vi.mocked(prisma.invoice.update).mockResolvedValue({} as never);

      const req = mockReq({ invoiceId: "clx_inv_001", contractId: "contract_123" });
      withUser(req, "clx1234567891", "CLIENT");
      const res = mockRes();

      await escrowController.createEscrow(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ escrow: expect.any(Object) }),
        })
      );
    });

    it("should reject escrow creation by freelancer", async () => {
      const req = mockReq({ invoiceId: "clx_inv_001", contractId: "contract_123" });
      withUser(req, "clx1234567890", "FREELANCER");
      const res = mockRes();

      await expect(escrowController.createEscrow(req, res)).rejects.toThrow("Only clients can create escrows");
    });

    it("should reject duplicate escrow", async () => {
      vi.mocked(prisma.invoice.findUnique).mockResolvedValue({
        ...mockInvoice,
        status: "PENDING",
      } as never);
      vi.mocked(prisma.escrow.findUnique).mockResolvedValue(mockEscrow as never);

      const req = mockReq({ invoiceId: "clx_inv_001", contractId: "contract_123" });
      withUser(req, "clx1234567891", "CLIENT");
      const res = mockRes();

      await expect(escrowController.createEscrow(req, res)).rejects.toThrow("Escrow already exists for this invoice");
    });
  });

  describe("fundEscrow", () => {
    it("should fund escrow as client", async () => {
      vi.mocked(prisma.escrow.findUnique).mockResolvedValue(mockEscrow as never);
      vi.mocked(stellarService.fundEscrow).mockResolvedValue({
        success: true,
        txHash: "tx_fund_123",
      });
      vi.mocked(prisma.escrow.update).mockResolvedValue({
        ...mockEscrow,
        status: "FUNDED",
        fundedAt: new Date(),
      } as never);
      vi.mocked(prisma.payment.create).mockResolvedValue({} as never);
      vi.mocked(prisma.invoice.update).mockResolvedValue({} as never);

      const req = mockReq({ txHash: "tx_fund_123" }, { id: "clx_esc_001" });
      withUser(req, "clx1234567891", "CLIENT");
      const res = mockRes();

      await escrowController.fundEscrow(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ escrow: expect.any(Object) }),
        })
      );
    });

    it("should reject funding by non-client", async () => {
      vi.mocked(prisma.escrow.findUnique).mockResolvedValue(mockEscrow as never);

      const req = mockReq({ txHash: "tx_fund_123" }, { id: "clx_esc_001" });
      withUser(req, "clx1234567890", "FREELANCER");
      const res = mockRes();

      await expect(escrowController.fundEscrow(req, res)).rejects.toThrow("Only the client can fund this escrow");
    });
  });

  describe("releaseEscrow", () => {
    it("should release escrow as freelancer", async () => {
      vi.mocked(prisma.escrow.findUnique).mockResolvedValue({
        ...mockEscrow,
        status: "FUNDED",
      } as never);
      vi.mocked(stellarService.releaseEscrowFunds).mockResolvedValue({
        success: true,
        txHash: "tx_release_123",
      });
      vi.mocked(prisma.escrow.update).mockResolvedValue({
        ...mockEscrow,
        status: "RELEASED",
        releasedAt: new Date(),
      } as never);
      vi.mocked(prisma.payment.create).mockResolvedValue({} as never);
      vi.mocked(prisma.invoice.update).mockResolvedValue({} as never);

      const req = mockReq({ txHash: "tx_release_123" }, { id: "clx_esc_001" });
      withUser(req, "clx1234567890", "FREELANCER");
      const res = mockRes();

      await escrowController.releaseEscrow(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ escrow: expect.any(Object) }),
        })
      );
    });

    it("should reject release by client", async () => {
      vi.mocked(prisma.escrow.findUnique).mockResolvedValue({
        ...mockEscrow,
        status: "FUNDED",
      } as never);

      const req = mockReq({ txHash: "tx_release_123" }, { id: "clx_esc_001" });
      withUser(req, "clx1234567891", "CLIENT");
      const res = mockRes();

      await expect(escrowController.releaseEscrow(req, res)).rejects.toThrow("Only the freelancer or admin can release escrow");
    });
  });

  describe("refundEscrow", () => {
    it("should refund escrow as admin", async () => {
      vi.mocked(prisma.escrow.findUnique).mockResolvedValue({
        ...mockEscrow,
        status: "FUNDED",
      } as never);
      vi.mocked(stellarService.refundEscrowFunds).mockResolvedValue({
        success: true,
        txHash: "tx_refund_123",
      });
      vi.mocked(prisma.escrow.update).mockResolvedValue({
        ...mockEscrow,
        status: "REFUNDED",
        refundedAt: new Date(),
      } as never);
      vi.mocked(prisma.payment.create).mockResolvedValue({} as never);
      vi.mocked(prisma.invoice.update).mockResolvedValue({} as never);

      const req = mockReq({ txHash: "tx_refund_123" }, { id: "clx_esc_001" });
      withUser(req, "clx_admin", "ADMIN");
      const res = mockRes();

      await escrowController.refundEscrow(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ escrow: expect.any(Object) }),
        })
      );
    });

    it("should reject refund by non-admin", async () => {
      vi.mocked(prisma.escrow.findUnique).mockResolvedValue({
        ...mockEscrow,
        status: "FUNDED",
      } as never);

      const req = mockReq({ txHash: "tx_refund_123" }, { id: "clx_esc_001" });
      withUser(req, "clx1234567891", "CLIENT");
      const res = mockRes();

      await expect(escrowController.refundEscrow(req, res)).rejects.toThrow("Only admins can refund escrow");
    });
  });

  describe("getEscrow", () => {
    it("should return escrow for authorized user", async () => {
      vi.mocked(prisma.escrow.findUnique).mockResolvedValue(mockEscrow as never);

      const req = mockReq({}, { id: "clx_esc_001" });
      withUser(req, "clx1234567891", "CLIENT");
      const res = mockRes();

      await escrowController.getEscrow(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ escrow: expect.any(Object) }),
        })
      );
    });

    it("should deny access to non-participant", async () => {
      vi.mocked(prisma.escrow.findUnique).mockResolvedValue(mockEscrow as never);

      const req = mockReq({}, { id: "clx_esc_001" });
      withUser(req, "clx_unauthorized", "FREELANCER");
      const res = mockRes();

      await expect(escrowController.getEscrow(req, res)).rejects.toThrow("You don't have access to this escrow");
    });
  });
});
