import type { Request, Response, NextFunction } from "express";
import { prisma } from "../config/prisma.js";
import { NotFoundError, ForbiddenError, ConflictError } from "../utils/AppError.js";
import type { CreateInvoiceInput, UpdateInvoiceInput, InvoiceQueryInput } from "../validators/invoice.schema.js";

const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["PENDING", "CANCELLED"],
  PENDING: ["FUNDED", "CANCELLED"],
  FUNDED: ["IN_ESCROW"],
  IN_ESCROW: ["COMPLETED", "DISPUTED"],
  COMPLETED: [],
  CANCELLED: [],
  DISPUTED: [],
};

export async function createInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const data = req.body as CreateInvoiceInput;

    const recipient = await prisma.user.findUnique({ where: { id: data.recipientId } });
    if (!recipient) {
      throw new NotFoundError("Recipient");
    }

    const invoice = await prisma.invoice.create({
      data: {
        creatorId: userId,
        recipientId: data.recipientId,
        title: data.title,
        description: data.description,
        amount: data.amount,
        currency: data.currency,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        lineItems: data.lineItems ?? [],
        status: "DRAFT",
      },
      include: {
        creator: { select: { id: true, fullname: true, email: true, walletAddress: true } },
        recipient: { select: { id: true, fullname: true, email: true, walletAddress: true } },
      },
    });

    res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
}

export async function getInvoices(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const userRole = req.user!.role;
    const { page, limit, status, search, sortBy, sortOrder } = req.query as unknown as InvoiceQueryInput;

    const where: Record<string, unknown> = {};

    if (userRole === "FREELANCER") {
      where.recipientId = userId;
    } else if (userRole === "CLIENT") {
      where.creatorId = userId;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          creator: { select: { id: true, fullname: true, email: true, walletAddress: true } },
          recipient: { select: { id: true, fullname: true, email: true, walletAddress: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.invoice.count({ where }),
    ]);

    res.json({
      success: true,
      data: invoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getInvoiceById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, fullname: true, email: true, walletAddress: true } },
        recipient: { select: { id: true, fullname: true, email: true, walletAddress: true } },
        escrow: true,
      },
    });

    if (!invoice) {
      throw new NotFoundError("Invoice");
    }

    if (invoice.creatorId !== userId && invoice.recipientId !== userId) {
      throw new ForbiddenError("You do not have access to this invoice");
    }

    res.json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
}

export async function updateInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const data = req.body as UpdateInvoiceInput;

    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) {
      throw new NotFoundError("Invoice");
    }

    if (invoice.creatorId !== userId) {
      throw new ForbiddenError("Only the invoice creator can update this invoice");
    }

    if (data.status && invoice.status !== data.status) {
      const allowed = VALID_TRANSITIONS[invoice.status] ?? [];
      if (!allowed.includes(data.status)) {
        throw new ConflictError(`Cannot transition from ${invoice.status} to ${data.status}`);
      }
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description && { description: data.description }),
        ...(data.amount && { amount: data.amount }),
        ...(data.currency && { currency: data.currency }),
        ...(data.dueDate && { dueDate: new Date(data.dueDate) }),
        ...(data.lineItems && { lineItems: data.lineItems }),
        ...(data.status && { status: data.status }),
      },
      include: {
        creator: { select: { id: true, fullname: true, email: true, walletAddress: true } },
        recipient: { select: { id: true, fullname: true, email: true, walletAddress: true } },
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
}

export async function deleteInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) {
      throw new NotFoundError("Invoice");
    }

    if (invoice.creatorId !== userId) {
      throw new ForbiddenError("Only the invoice creator can delete this invoice");
    }

    if (invoice.status !== "DRAFT") {
      throw new ConflictError("Only draft invoices can be deleted");
    }

    await prisma.invoice.delete({ where: { id } });

    res.json({ success: true, message: "Invoice deleted" });
  } catch (error) {
    next(error);
  }
}
