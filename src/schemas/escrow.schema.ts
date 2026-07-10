import { z } from "zod";

export const createEscrowSchema = z.object({
  invoiceId: z.string().min(1, "Invoice ID is required"),
  contractId: z.string().min(1, "Contract ID is required"),
});

export const fundEscrowSchema = z.object({
  txHash: z.string().min(1, "Transaction hash is required"),
});

export const releaseEscrowSchema = z.object({
  txHash: z.string().min(1, "Transaction hash is required"),
});

export const refundEscrowSchema = z.object({
  txHash: z.string().min(1, "Transaction hash is required"),
});

export const getEscrowSchema = z.object({
  id: z.string().min(1, "Escrow ID is required"),
});

export type CreateEscrowInput = z.infer<typeof createEscrowSchema>;
export type FundEscrowInput = z.infer<typeof fundEscrowSchema>;
export type ReleaseEscrowInput = z.infer<typeof releaseEscrowSchema>;
export type RefundEscrowInput = z.infer<typeof refundEscrowSchema>;
