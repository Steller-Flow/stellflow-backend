import type { Request } from "express";
import { prisma } from "../config/prisma.js";
import type { AuditAction } from "@prisma/client";

export interface AuditLogEntry {
  userId?: string;
  action: AuditAction;
  resource?: string;
  resourceId?: string;
  description: string;
  ipAddress: string;
  userAgent: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0]?.trim() ?? req.socket.remoteAddress ?? "";
  }
  return req.socket.remoteAddress ?? "";
}

export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    const data: {
      userId: string | null;
      action: AuditAction;
      resource: string | null;
      resourceId: string | null;
      description: string;
      ipAddress: string;
      userAgent: string;
      metadata?: Record<string, string | number | boolean | null>;
    } = {
      userId: entry.userId ?? null,
      action: entry.action,
      resource: entry.resource ?? null,
      resourceId: entry.resourceId ?? null,
      description: entry.description,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
    };
    if (entry.metadata) {
      data.metadata = entry.metadata;
    }
    await prisma.auditLog.create({ data });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}

export async function logAuditFromRequest(
  req: Request,
  entry: Omit<AuditLogEntry, "ipAddress" | "userAgent">
): Promise<void> {
  await logAudit({
    ...entry,
    ipAddress: getClientIp(req),
    userAgent: req.headers["user-agent"] ?? "",
  });
}

export async function getAuditLogs(params: {
  userId?: string;
  action?: AuditAction;
  resource?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}): Promise<{ logs: Awaited<ReturnType<typeof prisma.auditLog.findMany>>; total: number }> {
  const { userId, action, resource, startDate, endDate, page = 1, limit = 50 } = params;

  const where: Record<string, unknown> = {};

  if (userId) where.userId = userId;
  if (action) where.action = action;
  if (resource) where.resource = resource;

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) (where.createdAt as Record<string, Date>).gte = startDate;
    if (endDate) (where.createdAt as Record<string, Date>).lte = endDate;
  }

  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      include: {
        user: {
          select: { id: true, fullname: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total };
}
