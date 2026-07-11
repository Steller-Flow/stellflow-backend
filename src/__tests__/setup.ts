import { vi } from "vitest";

vi.mock("../config/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    invoice: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    escrow: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    payment: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    notification: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("../services/stellar.service.js", () => ({
  createEscrowContract: vi.fn().mockResolvedValue({
    success: true,
    txHash: "tx_mock_123",
    contractId: "contract_mock_123",
  }),
  fundEscrow: vi.fn().mockResolvedValue({
    success: true,
    txHash: "tx_mock_fund",
  }),
  releaseEscrowFunds: vi.fn().mockResolvedValue({
    success: true,
    txHash: "tx_mock_release",
  }),
  refundEscrowFunds: vi.fn().mockResolvedValue({
    success: true,
    txHash: "tx_mock_refund",
  }),
}));
