import type { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { NotFoundError, ForbiddenError, BadRequestError } from "../utils/AppError.js";
import type { AuthRequest } from "../middleware/auth.js";
import * as stellarService from "../services/stellar.service.js";
import { broadcastToUser, broadcastToEscrow } from "../services/socket.service.js";
import { logAuditFromRequest } from "../services/audit.service.js";

const VALID_ESCROW_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["FUNDED", "REFUNDED"],
  FUNDED: ["RELEASED", "REFUNDED", "DISPUTED"],
  RELEASED: [],
  REFUNDED: [],
  DISPUTED: [],
};

export async function createEscrow(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthRequest;

  if (authReq.user.role !== "CLIENT" && authReq.user.role !== "ADMIN") {
    throw new ForbiddenError("Only clients can create escrows");
  }

  const { invoiceId, contractId } = req.body;

  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) {
    throw new NotFoundError("Invoice");
  }

  if (invoice.recipientId !== authReq.user.userId && authReq.user.role !== "ADMIN") {
    throw new ForbiddenError("You can only create escrows for invoices addressed to you");
  }

  if (invoice.status !== "PENDING" && invoice.status !== "DRAFT") {
    throw new BadRequestError("Invoice must be in DRAFT or PENDING status to create escrow");
  }

  const existingEscrow = await prisma.escrow.findUnique({ where: { invoiceId } });
  if (existingEscrow) {
    throw new BadRequestError("Escrow already exists for this invoice");
  }

  const stellarResult = await stellarService.createEscrowContract(
    invoice.recipientId,
    invoice.creatorId,
    invoice.amount.toString(),
    invoice.currency
  );

  if (!stellarResult.success) {
    throw new BadRequestError("Failed to create escrow contract on Stellar");
  }

  const escrow = await prisma.escrow.create({
    data: {
      invoiceId,
      clientId: invoice.recipientId,
      freelancerId: invoice.creatorId,
      contractId: stellarResult.contractId ?? contractId,
      amount: invoice.amount,
      currency: invoice.currency,
    },
    include: {
      invoice: {
        select: { id: true, title: true, amount: true, status: true },
      },
      client: {
        select: { id: true, fullname: true, email: true },
      },
      freelancer: {
        select: { id: true, fullname: true, email: true },
      },
    },
  });

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: "IN_ESCROW", contractId: escrow.contractId },
  });

  await logAuditFromRequest(req, {
    userId: authReq.user.userId,
    action: "ESCROW_CREATED",
    resource: "Escrow",
    resourceId: escrow.id,
    description: `Escrow created for invoice ${invoiceId} with amount ${invoice.amount} ${invoice.currency}`,
    metadata: { invoiceId, amount: invoice.amount.toString(), currency: invoice.currency },
  });

  broadcastToUser(invoice.creatorId, "escrow:created", {
    escrowId: escrow.id,
    invoiceId,
    amount: escrow.amount.toString(),
    currency: escrow.currency,
  });

  res.status(201).json({
    success: true,
    data: { escrow },
  });
}

export async function fundEscrow(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthRequest;
  const id = String(req.params["id"]);
  const { txHash } = req.body;

  const escrow = await prisma.escrow.findUnique({ where: { id } });
  if (!escrow) {
    throw new NotFoundError("Escrow");
  }

  if (escrow.clientId !== authReq.user.userId && authReq.user.role !== "ADMIN") {
    throw new ForbiddenError("Only the client can fund this escrow");
  }

  const allowedTransitions = VALID_ESCROW_TRANSITIONS[escrow.status] ?? [];
  if (!allowedTransitions.includes("FUNDED")) {
    throw new BadRequestError(`Cannot fund escrow in ${escrow.status} status`);
  }

  const stellarResult = await stellarService.fundEscrow(
    escrow.contractId,
    escrow.amount.toString(),
    escrow.currency,
    txHash
  );

  if (!stellarResult.success) {
    throw new BadRequestError("Failed to fund escrow on Stellar");
  }

  const updatedEscrow = await prisma.escrow.update({
    where: { id },
    data: {
      status: "FUNDED",
      fundedAt: new Date(),
      txHash,
    },
    include: {
      invoice: {
        select: { id: true, title: true, amount: true, status: true },
      },
      client: {
        select: { id: true, fullname: true, email: true },
      },
      freelancer: {
        select: { id: true, fullname: true, email: true },
      },
    },
  });

  await prisma.payment.create({
    data: {
      userId: escrow.clientId,
      escrowId: escrow.id,
      amount: escrow.amount,
      currency: escrow.currency,
      txHash,
      status: "SUCCESS",
      description: "Funded escrow for invoice",
    },
  });

  await prisma.invoice.update({
    where: { id: escrow.invoiceId },
    data: { status: "FUNDED", txHash },
  });

  await logAuditFromRequest(req, {
    userId: authReq.user.userId,
    action: "ESCROW_FUNDED",
    resource: "Escrow",
    resourceId: id,
    description: `Escrow funded with ${escrow.amount} ${escrow.currency}, txHash: ${txHash}`,
    metadata: { amount: escrow.amount.toString(), currency: escrow.currency, txHash },
  });

  broadcastToEscrow(id, "escrow:stateChange", {
    escrowId: id,
    status: "FUNDED",
    txHash,
  });
  broadcastToUser(escrow.freelancerId, "escrow:funded", {
    escrowId: id,
    amount: escrow.amount.toString(),
    currency: escrow.currency,
    txHash,
  });

  res.json({
    success: true,
    data: { escrow: updatedEscrow },
  });
}

export async function releaseEscrow(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthRequest;
  const id = String(req.params["id"]);
  const { txHash } = req.body;

  const escrow = await prisma.escrow.findUnique({ where: { id } });
  if (!escrow) {
    throw new NotFoundError("Escrow");
  }

  if (authReq.user.role !== "ADMIN") {
    if (escrow.freelancerId !== authReq.user.userId) {
      throw new ForbiddenError("Only the freelancer or admin can release escrow");
    }
  }

  const allowedTransitions = VALID_ESCROW_TRANSITIONS[escrow.status] ?? [];
  if (!allowedTransitions.includes("RELEASED")) {
    throw new BadRequestError(`Cannot release escrow in ${escrow.status} status`);
  }

  const stellarResult = await stellarService.releaseEscrowFunds(escrow.contractId, txHash);

  if (!stellarResult.success) {
    throw new BadRequestError("Failed to release escrow funds on Stellar");
  }

  const updatedEscrow = await prisma.escrow.update({
    where: { id },
    data: {
      status: "RELEASED",
      releasedAt: new Date(),
      txHash,
    },
    include: {
      invoice: {
        select: { id: true, title: true, amount: true, status: true },
      },
      client: {
        select: { id: true, fullname: true, email: true },
      },
      freelancer: {
        select: { id: true, fullname: true, email: true },
      },
    },
  });

  await prisma.payment.create({
    data: {
      userId: escrow.freelancerId,
      escrowId: escrow.id,
      amount: escrow.amount,
      currency: escrow.currency,
      txHash,
      status: "SUCCESS",
      description: "Released escrow payment",
    },
  });

  await prisma.invoice.update({
    where: { id: escrow.invoiceId },
    data: { status: "COMPLETED", paidAt: new Date(), txHash },
  });

  await logAuditFromRequest(req, {
    userId: authReq.user.userId,
    action: "ESCROW_RELEASED",
    resource: "Escrow",
    resourceId: id,
    description: `Escrow funds released: ${escrow.amount} ${escrow.currency} to freelancer, txHash: ${txHash}`,
    metadata: { amount: escrow.amount.toString(), currency: escrow.currency, txHash, freelancerId: escrow.freelancerId },
  });

  broadcastToEscrow(id, "escrow:stateChange", {
    escrowId: id,
    status: "RELEASED",
    txHash,
  });
  broadcastToUser(escrow.clientId, "escrow:released", {
    escrowId: id,
    amount: escrow.amount.toString(),
    currency: escrow.currency,
    txHash,
  });

  res.json({
    success: true,
    data: { escrow: updatedEscrow },
  });
}

export async function refundEscrow(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthRequest;
  const id = String(req.params["id"]);
  const { txHash } = req.body;

  const escrow = await prisma.escrow.findUnique({ where: { id } });
  if (!escrow) {
    throw new NotFoundError("Escrow");
  }

  if (authReq.user.role !== "ADMIN") {
    throw new ForbiddenError("Only admins can refund escrow");
  }

  const allowedTransitions = VALID_ESCROW_TRANSITIONS[escrow.status] ?? [];
  if (!allowedTransitions.includes("REFUNDED")) {
    throw new BadRequestError(`Cannot refund escrow in ${escrow.status} status`);
  }

  const stellarResult = await stellarService.refundEscrowFunds(escrow.contractId, txHash);

  if (!stellarResult.success) {
    throw new BadRequestError("Failed to refund escrow on Stellar");
  }

  const updatedEscrow = await prisma.escrow.update({
    where: { id },
    data: {
      status: "REFUNDED",
      refundedAt: new Date(),
      txHash,
    },
    include: {
      invoice: {
        select: { id: true, title: true, amount: true, status: true },
      },
      client: {
        select: { id: true, fullname: true, email: true },
      },
      freelancer: {
        select: { id: true, fullname: true, email: true },
      },
    },
  });

  await prisma.payment.create({
    data: {
      userId: escrow.clientId,
      escrowId: escrow.id,
      amount: escrow.amount,
      currency: escrow.currency,
      txHash,
      status: "SUCCESS",
      description: "Refunded escrow payment",
    },
  });

  await prisma.invoice.update({
    where: { id: escrow.invoiceId },
    data: { status: "CANCELLED", txHash },
  });

  await logAuditFromRequest(req, {
    userId: authReq.user.userId,
    action: "ESCROW_REFUNDED",
    resource: "Escrow",
    resourceId: id,
    description: `Escrow refunded: ${escrow.amount} ${escrow.currency} to client, txHash: ${txHash}`,
    metadata: { amount: escrow.amount.toString(), currency: escrow.currency, txHash, clientId: escrow.clientId },
  });

  broadcastToEscrow(id, "escrow:stateChange", {
    escrowId: id,
    status: "REFUNDED",
    txHash,
  });
  broadcastToUser(escrow.freelancerId, "escrow:refunded", {
    escrowId: id,
    amount: escrow.amount.toString(),
    currency: escrow.currency,
    txHash,
  });

  res.json({
    success: true,
    data: { escrow: updatedEscrow },
  });
}

export async function getEscrow(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthRequest;
  const id = String(req.params["id"]);

  const escrow = await prisma.escrow.findUnique({
    where: { id },
    include: {
      invoice: {
        select: { id: true, title: true, amount: true, status: true },
      },
      client: {
        select: { id: true, fullname: true, email: true },
      },
      freelancer: {
        select: { id: true, fullname: true, email: true },
      },
      payments: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  if (!escrow) {
    throw new NotFoundError("Escrow");
  }

  if (
    escrow.clientId !== authReq.user.userId &&
    escrow.freelancerId !== authReq.user.userId &&
    authReq.user.role !== "ADMIN"
  ) {
    throw new ForbiddenError("You don't have access to this escrow");
  }

  res.json({
    success: true,
    data: { escrow },
  });
}
