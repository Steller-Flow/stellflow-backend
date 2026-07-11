import type { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { NotFoundError, ForbiddenError, BadRequestError } from "../utils/AppError.js";
import type { AuthRequest } from "../middleware/auth.js";
import { getPaginationParams, getPaginationMeta, getSkipTake } from "../utils/pagination.js";
import { broadcastToUser } from "../services/socket.service.js";
import { logAuditFromRequest } from "../services/audit.service.js";

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["PENDING", "CANCELLED"],
  PENDING: ["FUNDED", "CANCELLED"],
  FUNDED: ["IN_ESCROW"],
  IN_ESCROW: ["COMPLETED", "DISPUTED"],
  COMPLETED: [],
  CANCELLED: [],
  DISPUTED: [],
};

export async function createInvoice(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthRequest;

  if (authReq.user.role !== "FREELANCER" && authReq.user.role !== "ADMIN") {
    throw new ForbiddenError("Only freelancers can create invoices");
  }

  const { recipientId, title, description, amount, currency, dueDate } = req.body;

  const recipient = await prisma.user.findUnique({ where: { id: recipientId } });
  if (!recipient) {
    throw new NotFoundError("Recipient");
  }

  if (recipientId === authReq.user.userId) {
    throw new BadRequestError("Cannot create invoice for yourself");
  }

  const invoice = await prisma.invoice.create({
    data: {
      creatorId: authReq.user.userId,
      recipientId,
      title,
      description,
      amount,
      currency: currency ?? "USDC",
      dueDate: dueDate ? new Date(dueDate) : null,
    },
    include: {
      creator: {
        select: { id: true, fullname: true, email: true },
      },
      recipient: {
        select: { id: true, fullname: true, email: true },
      },
    },
  });

  await logAuditFromRequest(req, {
    userId: authReq.user.userId,
    action: "INVOICE_CREATED",
    resource: "Invoice",
    resourceId: invoice.id,
    description: `Invoice created: ${title} for ${amount} ${currency ?? "USDC"}`,
    metadata: { title, amount, currency, recipientId },
  });

  broadcastToUser(recipientId, "invoice:sent", {
    invoiceId: invoice.id,
    title: invoice.title,
    amount: invoice.amount.toString(),
    currency: invoice.currency,
  });

  res.status(201).json({
    success: true,
    data: { invoice },
  });
}

export async function getInvoices(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthRequest;
  const { page: rawPage, limit: rawLimit, status, search, creatorId, recipientId } = req.query;

  const pagination = getPaginationParams({
    page: String(rawPage ?? ""),
    limit: String(rawLimit ?? ""),
  });
  const { skip, take } = getSkipTake(pagination.page, pagination.limit);

  const where: Record<string, unknown> = {};

  if (authReq.user.role === "FREELANCER") {
    where.creatorId = authReq.user.userId;
  } else if (authReq.user.role === "CLIENT") {
    where.recipientId = authReq.user.userId;
  }

  if (creatorId) where.creatorId = String(creatorId);
  if (recipientId) where.recipientId = String(recipientId);
  if (status) where.status = String(status);

  if (search) {
    where.OR = [
      { title: { contains: String(search), mode: "insensitive" } },
      { description: { contains: String(search), mode: "insensitive" } },
    ];
  }

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      skip,
      take,
      include: {
        creator: {
          select: { id: true, fullname: true, email: true },
        },
        recipient: {
          select: { id: true, fullname: true, email: true },
        },
        escrow: {
          select: { id: true, status: true, amount: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.invoice.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      invoices,
      pagination: getPaginationMeta(pagination.page, pagination.limit, total),
    },
  });
}

export async function getInvoice(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthRequest;
  const id = String(req.params["id"]);

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      creator: {
        select: { id: true, fullname: true, email: true },
      },
      recipient: {
        select: { id: true, fullname: true, email: true },
      },
      escrow: true,
    },
  });

  if (!invoice) {
    throw new NotFoundError("Invoice");
  }

  if (invoice.creatorId !== authReq.user.userId && invoice.recipientId !== authReq.user.userId) {
    throw new ForbiddenError("You don't have access to this invoice");
  }

  res.json({
    success: true,
    data: { invoice },
  });
}

export async function updateInvoice(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthRequest;
  const id = String(req.params["id"]);
  const { title, description, amount, status, dueDate } = req.body;

  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) {
    throw new NotFoundError("Invoice");
  }

  if (invoice.creatorId !== authReq.user.userId) {
    throw new ForbiddenError("Only the invoice creator can update it");
  }

  if (status && status !== invoice.status) {
    const allowedTransitions = VALID_STATUS_TRANSITIONS[invoice.status] ?? [];
    if (!allowedTransitions.includes(status)) {
      throw new BadRequestError(
        `Cannot transition from ${invoice.status} to ${status}`
      );
    }
  }

  const updatedInvoice = await prisma.invoice.update({
    where: { id },
    data: {
      ...(title != null && { title }),
      ...(description != null && { description }),
      ...(amount != null && { amount }),
      ...(status != null && { status }),
      ...(dueDate != null && { dueDate: new Date(dueDate) }),
    },
    include: {
      creator: {
        select: { id: true, fullname: true, email: true },
      },
      recipient: {
        select: { id: true, fullname: true, email: true },
      },
      escrow: true,
    },
  });

  if (status && status !== invoice.status) {
    await logAuditFromRequest(req, {
      userId: authReq.user.userId,
      action: "INVOICE_STATUS_CHANGED",
      resource: "Invoice",
      resourceId: id,
      description: `Invoice status changed: ${invoice.status} -> ${status}`,
      metadata: { oldStatus: invoice.status, newStatus: status },
    });

    broadcastToUser(invoice.recipientId, "invoice:statusUpdate", {
      invoiceId: id,
      oldStatus: invoice.status,
      newStatus: status,
    });
  } else {
    await logAuditFromRequest(req, {
      userId: authReq.user.userId,
      action: "INVOICE_UPDATED",
      resource: "Invoice",
      resourceId: id,
      description: `Invoice updated`,
      metadata: { fields: Object.keys(req.body).filter((k) => req.body[k] !== undefined).join(",") },
    });
  }

  res.json({
    success: true,
    data: { invoice: updatedInvoice },
  });
}

export async function deleteInvoice(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthRequest;
  const id = String(req.params["id"]);

  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) {
    throw new NotFoundError("Invoice");
  }

  if (invoice.creatorId !== authReq.user.userId) {
    throw new ForbiddenError("Only the invoice creator can delete it");
  }

  if (invoice.status !== "DRAFT") {
    throw new BadRequestError("Only draft invoices can be deleted");
  }

  await logAuditFromRequest(req, {
    userId: authReq.user.userId,
    action: "INVOICE_DELETED",
    resource: "Invoice",
    resourceId: id,
    description: `Invoice deleted: ${invoice.title}`,
    metadata: { title: invoice.title, amount: invoice.amount.toString() },
  });

  await prisma.invoice.delete({ where: { id } });

  res.json({
    success: true,
    data: { message: "Invoice deleted successfully" },
  });
}
