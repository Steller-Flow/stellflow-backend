import { z } from "zod";

export const createInvoiceSchema = z.object({
  recipientId: z.string().min(1, "Recipient ID is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  amount: z.number().positive("Amount must be positive"),
  currency: z.string().default("USDC"),
  dueDate: z.string().datetime().optional(),
});

export const updateInvoiceSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  status: z.enum(["DRAFT", "PENDING", "FUNDED", "IN_ESCROW", "COMPLETED", "CANCELLED", "DISPUTED"]).optional(),
  dueDate: z.string().datetime().optional(),
});

export const listInvoicesSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: z.enum(["DRAFT", "PENDING", "FUNDED", "IN_ESCROW", "COMPLETED", "CANCELLED", "DISPUTED"]).optional(),
  search: z.string().optional(),
  creatorId: z.string().optional(),
  recipientId: z.string().optional(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type ListInvoicesInput = z.infer<typeof listInvoicesSchema>;
