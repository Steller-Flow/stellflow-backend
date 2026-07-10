import { z } from "zod";

const lineItemSchema = z.object({
  description: z.string().min(1, "Line item description is required"),
  quantity: z.number().int().positive("Quantity must be a positive integer"),
  unitPrice: z.number().positive("Unit price must be positive"),
});

export const createInvoiceSchema = z.object({
  recipientId: z.string().min(1, "Recipient ID is required"),
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().min(1, "Description is required").max(2000),
  amount: z.number().positive("Amount must be positive"),
  currency: z.string().default("USDC"),
  dueDate: z.string().datetime().optional(),
  lineItems: z.array(lineItemSchema).optional().default([]),
});

export const updateInvoiceSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(2000).optional(),
  amount: z.number().positive().optional(),
  currency: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  lineItems: z.array(lineItemSchema).optional(),
  status: z.enum(["DRAFT", "PENDING", "CANCELLED"]).optional(),
});

export const invoiceQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(["DRAFT", "PENDING", "FUNDED", "IN_ESCROW", "COMPLETED", "CANCELLED", "DISPUTED"]).optional(),
  search: z.string().optional(),
  sortBy: z.enum(["createdAt", "amount", "dueDate"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type InvoiceQueryInput = z.infer<typeof invoiceQuerySchema>;
