import { z } from "zod";

export const createPaymentSchema = z.object({
  escrowId: z.string().min(1, "Escrow ID is required").optional(),
  amount: z.number().positive("Amount must be positive"),
  currency: z.string().default("USDC"),
  txHash: z.string().min(1, "Transaction hash is required"),
  description: z.string().max(500).optional(),
});

export const verifyPaymentSchema = z.object({
  txHash: z.string().min(1, "Transaction hash is required"),
});

export const paymentQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(["PENDING", "SUCCESS", "FAILED"]).optional(),
  sortBy: z.enum(["createdAt", "amount"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const paymentWebhookSchema = z.object({
  txHash: z.string().min(1),
  status: z.enum(["CONFIRMED", "FAILED"]),
  confirmations: z.number().int().nonnegative().optional(),
  ledger: z.number().int().positive().optional(),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
export type PaymentQueryInput = z.infer<typeof paymentQuerySchema>;
export type PaymentWebhookInput = z.infer<typeof paymentWebhookSchema>;
