import type { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import type { AuthRequest } from "../middleware/auth.js";

function getDateRange(startDate?: string, endDate?: string): { gte?: Date; lte?: Date } {
  const range: { gte?: Date; lte?: Date } = {};
  if (startDate) range.gte = new Date(startDate);
  if (endDate) range.lte = new Date(endDate);
  return range;
}

export async function getDashboardOverview(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthRequest;
  const userId = authReq.user.userId;

  const [totalEarnings, pendingPayments, activeEscrows, totalInvoices] = await Promise.all([
    prisma.payment.aggregate({
      where: { userId, status: "SUCCESS" },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.payment.aggregate({
      where: { userId, status: "PENDING" },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.escrow.findMany({
      where: {
        OR: [{ clientId: userId }, { freelancerId: userId }],
        status: { in: ["PENDING", "FUNDED"] },
      },
      select: { id: true, amount: true, status: true, currency: true },
    }),
    prisma.invoice.count({
      where: {
        OR: [{ creatorId: userId }, { recipientId: userId }],
      },
    }),
  ]);

  const pendingEscrowAmount = activeEscrows.reduce(
    (sum: number, escrow: { amount: unknown }) => sum + Number(escrow.amount),
    0
  );

  res.json({
    success: true,
    data: {
      totalEarnings: {
        amount: totalEarnings._sum.amount ?? 0,
        count: totalEarnings._count,
      },
      pendingPayments: {
        amount: pendingPayments._sum.amount ?? 0,
        count: pendingPayments._count,
      },
      escrowSummary: {
        active: activeEscrows.length,
        pendingAmount: pendingEscrowAmount,
        escrows: activeEscrows,
      },
      totalInvoices,
    },
  });
}

export async function getMonthlyRevenue(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthRequest;
  const userId = authReq.user.userId;
  const { startDate, endDate } = req.query;

  const dateRange = getDateRange(
    startDate as string | undefined,
    endDate as string | undefined
  );

  const where: Record<string, unknown> = {
    userId,
    status: "SUCCESS",
  };

  if (startDate || endDate) {
    where.createdAt = dateRange;
  }

  const payments = await prisma.payment.findMany({
    where,
    select: {
      amount: true,
      currency: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const monthlyRevenue: Record<string, { usdc: number; count: number }> = {};

  for (const payment of payments) {
    const monthKey = payment.createdAt.toISOString().slice(0, 7);
    if (!monthlyRevenue[monthKey]) {
      monthlyRevenue[monthKey] = { usdc: 0, count: 0 };
    }
    monthlyRevenue[monthKey].usdc += Number(payment.amount);
    monthlyRevenue[monthKey].count += 1;
  }

  const chartData = Object.entries(monthlyRevenue).map(([month, data]) => ({
    month,
    revenue: data.usdc,
    transactions: data.count,
  }));

  res.json({
    success: true,
    data: { chartData },
  });
}

export async function getTransactionVolume(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthRequest;
  const userId = authReq.user.userId;
  const { startDate, endDate } = req.query;

  const dateRange = getDateRange(
    startDate as string | undefined,
    endDate as string | undefined
  );

  const where: Record<string, unknown> = {
    userId,
  };

  if (startDate || endDate) {
    where.createdAt = dateRange;
  }

  const [totalPayments, successfulPayments, failedPayments, pendingPayments] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.count({ where: { ...where, status: "SUCCESS" } }),
    prisma.payment.count({ where: { ...where, status: "FAILED" } }),
    prisma.payment.count({ where: { ...where, status: "PENDING" } }),
  ]);

  const totalVolume = await prisma.payment.aggregate({
    where: { ...where, status: "SUCCESS" },
    _sum: { amount: true },
  });

  res.json({
    success: true,
    data: {
      totalTransactions: totalPayments,
      successful: successfulPayments,
      failed: failedPayments,
      pending: pendingPayments,
      totalVolume: totalVolume._sum.amount ?? 0,
    },
  });
}

export async function getEscrowAnalytics(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthRequest;
  const userId = authReq.user.userId;
  const { startDate, endDate } = req.query;

  const dateRange = getDateRange(
    startDate as string | undefined,
    endDate as string | undefined
  );

  const where: Record<string, unknown> = {
    OR: [{ clientId: userId }, { freelancerId: userId }],
  };

  if (startDate || endDate) {
    where.createdAt = dateRange;
  }

  const [totalEscrows, pendingEscrows, fundedEscrows, releasedEscrows, refundedEscrows, disputedEscrows] =
    await Promise.all([
      prisma.escrow.count({ where }),
      prisma.escrow.count({ where: { ...where, status: "PENDING" } }),
      prisma.escrow.count({ where: { ...where, status: "FUNDED" } }),
      prisma.escrow.count({ where: { ...where, status: "RELEASED" } }),
      prisma.escrow.count({ where: { ...where, status: "REFUNDED" } }),
      prisma.escrow.count({ where: { ...where, status: "DISPUTED" } }),
    ]);

  const totalEscrowAmount = await prisma.escrow.aggregate({
    where: { ...where, status: "RELEASED" },
    _sum: { amount: true },
  });

  const pendingEscrowAmount = await prisma.escrow.aggregate({
    where: { ...where, status: { in: ["PENDING", "FUNDED"] } },
    _sum: { amount: true },
  });

  res.json({
    success: true,
    data: {
      totalEscrows,
      byStatus: {
        pending: pendingEscrows,
        funded: fundedEscrows,
        released: releasedEscrows,
        refunded: refundedEscrows,
        disputed: disputedEscrows,
      },
      totalReleasedAmount: totalEscrowAmount._sum.amount ?? 0,
      pendingAmount: pendingEscrowAmount._sum.amount ?? 0,
    },
  });
}

export async function getEarningsByPeriod(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthRequest;
  const userId = authReq.user.userId;
  const { startDate, endDate } = req.query;

  const dateRange = getDateRange(
    startDate as string | undefined,
    endDate as string | undefined
  );

  const where: Record<string, unknown> = {
    userId,
    status: "SUCCESS",
  };

  if (startDate || endDate) {
    where.createdAt = dateRange;
  }

  const earnings = await prisma.payment.aggregate({
    where,
    _sum: { amount: true },
    _count: true,
    _avg: { amount: true },
  });

  const escrowEarnings = await prisma.escrow.aggregate({
    where: {
      freelancerId: userId,
      status: "RELEASED",
      ...(startDate || endDate ? { releasedAt: dateRange } : {}),
    },
    _sum: { amount: true },
    _count: true,
  });

  res.json({
    success: true,
    data: {
      paymentEarnings: {
        total: earnings._sum.amount ?? 0,
        count: earnings._count,
        average: earnings._avg.amount ?? 0,
      },
      escrowEarnings: {
        total: escrowEarnings._sum.amount ?? 0,
        count: escrowEarnings._count,
      },
      combinedTotal:
        Number(earnings._sum.amount ?? 0) + Number(escrowEarnings._sum.amount ?? 0),
    },
  });
}
