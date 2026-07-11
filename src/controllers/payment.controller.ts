import type { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { NotFoundError, ForbiddenError, BadRequestError, ConflictError } from "../utils/AppError.js";
import type { AuthRequest } from "../middleware/auth.js";
import { getPaginationParams, getPaginationMeta, getSkipTake } from "../utils/pagination.js";
import * as stellarService from "../services/stellar.service.js";
import { getIO } from "../services/socket.service.js";
import type { CreatePaymentInput, PaymentWebhookInput } from "../validators/payment.schema.js";

export async function createPayment(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthRequest;
  const { escrowId, amount, currency, txHash, description } = req.body as CreatePaymentInput;

  const existingPayment = await prisma.payment.findUnique({ where: { txHash } });
  if (existingPayment) {
    throw new ConflictError("Payment with this transaction hash already exists");
  }

  if (escrowId) {
    const escrow = await prisma.escrow.findUnique({ where: { id: escrowId } });
    if (!escrow) {
      throw new NotFoundError("Escrow");
    }
    if (escrow.clientId !== authReq.user.userId && authReq.user.role !== "ADMIN") {
      throw new ForbiddenError("You don't have access to this escrow");
    }
  }

  const payment = await prisma.payment.create({
    data: {
      userId: authReq.user.userId,
      escrowId: escrowId ?? null,
      amount,
      currency: currency ?? "USDC",
      txHash,
      status: "PENDING",
      description: description ?? null,
    },
    include: {
      user: {
        select: { id: true, fullname: true, email: true },
      },
      escrow: {
        select: { id: true, status: true, amount: true },
      },
    },
  });

  res.status(201).json({
    success: true,
    data: { payment },
  });
}

export async function getPayments(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthRequest;
  const { page: rawPage, limit: rawLimit, status, sortBy, sortOrder } = req.query;

  const pagination = getPaginationParams({
    page: String(rawPage ?? ""),
    limit: String(rawLimit ?? ""),
  });
  const { skip, take } = getSkipTake(pagination.page, pagination.limit);

  const where: Record<string, unknown> = {};

  if (authReq.user.role !== "ADMIN") {
    where.userId = authReq.user.userId;
  }

  if (status) where.status = String(status);

  const orderBy: Record<string, string> = {};
  const sortField = String(sortBy ?? "createdAt");
  orderBy[sortField] = String(sortOrder ?? "desc");

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      skip,
      take,
      include: {
        user: {
          select: { id: true, fullname: true, email: true },
        },
        escrow: {
          select: { id: true, status: true, amount: true },
        },
      },
      orderBy,
    }),
    prisma.payment.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      payments,
      pagination: getPaginationMeta(pagination.page, pagination.limit, total),
    },
  });
}

export async function getPaymentById(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthRequest;
  const id = String(req.params["id"]);

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      user: {
        select: { id: true, fullname: true, email: true },
      },
      escrow: {
        select: { id: true, status: true, amount: true, clientId: true, freelancerId: true },
      },
    },
  });

  if (!payment) {
    throw new NotFoundError("Payment");
  }

  if (authReq.user.role !== "ADMIN" && payment.userId !== authReq.user.userId) {
    throw new ForbiddenError("You don't have access to this payment");
  }

  res.json({
    success: true,
    data: { payment },
  });
}

export async function verifyPayment(req: Request, res: Response): Promise<void> {
  const { txHash } = req.body;

  const payment = await prisma.payment.findUnique({ where: { txHash } });
  if (!payment) {
    throw new NotFoundError("Payment");
  }

  if (payment.status === "SUCCESS") {
    throw new BadRequestError("Payment already verified");
  }

  const verification = await stellarService.verifyTransaction(txHash);

  if (!verification.verified) {
    throw new BadRequestError("Transaction could not be verified on Stellar");
  }

  const updatedPayment = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: verification.success ? "SUCCESS" : "FAILED",
    },
    include: {
      user: {
        select: { id: true, fullname: true, email: true },
      },
      escrow: {
        select: { id: true, status: true, amount: true },
      },
    },
  });

  if (verification.success) {
    const io = getIO();
    if (io) {
      io.to(`user:${payment.userId}`).emit("payment:confirmed", {
        paymentId: payment.id,
        txHash: payment.txHash,
        amount: payment.amount.toString(),
        currency: payment.currency,
      });
    }
  }

  res.json({
    success: true,
    data: { payment: updatedPayment },
  });
}

export async function handlePaymentWebhook(req: Request, res: Response): Promise<void> {
  const { txHash, status, confirmations, ledger } = req.body as PaymentWebhookInput;

  const payment = await prisma.payment.findUnique({
    where: { txHash },
    include: {
      user: { select: { id: true, fullname: true } },
    },
  });

  if (!payment) {
    res.status(200).json({ success: true, message: "Payment not found, skipping" });
    return;
  }

  if (payment.status === "SUCCESS" && status === "CONFIRMED") {
    res.status(200).json({ success: true, message: "Already processed" });
    return;
  }

  const newStatus = status === "CONFIRMED" ? "SUCCESS" : "FAILED";

  const updatedPayment = await prisma.payment.update({
    where: { id: payment.id },
    data: { status: newStatus },
    include: {
      user: {
        select: { id: true, fullname: true, email: true },
      },
    },
  });

  const io = getIO();
  if (io) {
    io.to(`user:${payment.userId}`).emit("payment:confirmed", {
      paymentId: payment.id,
      txHash: payment.txHash,
      amount: payment.amount.toString(),
      currency: payment.currency,
      status: newStatus,
      confirmations,
      ledger,
    });

    if (payment.escrowId && newStatus === "SUCCESS") {
      const escrow = await prisma.escrow.findUnique({
        where: { id: payment.escrowId },
        select: { clientId: true, freelancerId: true },
      });
      if (escrow) {
        io.to(`user:${escrow.clientId}`).emit("escrow:funded", {
          escrowId: payment.escrowId,
          txHash: payment.txHash,
        });
        io.to(`user:${escrow.freelancerId}`).emit("escrow:funded", {
          escrowId: payment.escrowId,
          txHash: payment.txHash,
        });
      }
    }
  }

  res.status(200).json({
    success: true,
    data: { payment: updatedPayment },
  });
}
