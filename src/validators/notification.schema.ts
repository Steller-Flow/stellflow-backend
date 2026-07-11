import { z } from "zod";

export const createNotificationSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  title: z.string().min(1, "Title is required").max(200),
  message: z.string().min(1, "Message is required").max(2000),
  type: z.enum(["PAYMENT_RECEIVED", "ESCROW_FUNDED", "INVOICE_SENT", "ESCROW_RELEASED"]),
});

export const markAsReadSchema = z.object({
  notificationIds: z.array(z.string().min(1)).min(1, "At least one notification ID is required"),
});

export const notificationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  type: z.enum(["PAYMENT_RECEIVED", "ESCROW_FUNDED", "INVOICE_SENT", "ESCROW_RELEASED"]).optional(),
  isRead: z.coerce.boolean().optional(),
  sortBy: z.enum(["createdAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
export type MarkAsReadInput = z.infer<typeof markAsReadSchema>;
export type NotificationQueryInput = z.infer<typeof notificationQuerySchema>;
