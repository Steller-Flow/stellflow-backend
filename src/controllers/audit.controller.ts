import type { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { NotFoundError } from "../utils/AppError.js";
import type { AuthRequest } from "../middleware/auth.js";
import { getAuditLogs } from "../services/audit.service.js";
import { getPaginationMeta } from "../utils/pagination.js";
import type { AuditAction } from "@prisma/client";

export async function getAuditLogById(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthRequest;
  const id = String(req.params["id"]);

  const log = await prisma.auditLog.findUnique({
    where: { id },
    include: {
      user: {
        select: { id: true, fullname: true, email: true },
      },
    },
  });

  if (!log) {
    throw new NotFoundError("Audit log");
  }

  if (authReq.user.role !== "ADMIN" && log.userId !== authReq.user.userId) {
    res.status(403).json({
      success: false,
      error: { message: "You don't have access to this audit log" },
    });
    return;
  }

  res.json({
    success: true,
    data: { log },
  });
}

export async function getUserAuditLogs(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthRequest;
  const { action, resource, startDate, endDate, page: rawPage, limit: rawLimit } = req.query;

  const page = Math.max(1, parseInt(String(rawPage ?? "1"), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(rawLimit ?? "50"), 10) || 50));

  const params: {
    userId: string;
    action?: AuditAction;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
    page: number;
    limit: number;
  } = {
    userId: authReq.user.userId,
    page,
    limit,
  };

  if (action) params.action = action as AuditAction;
  if (resource) params.resource = String(resource);
  if (startDate) params.startDate = new Date(String(startDate));
  if (endDate) params.endDate = new Date(String(endDate));

  const { logs, total } = await getAuditLogs(params);

  res.json({
    success: true,
    data: {
      logs,
      pagination: getPaginationMeta(page, limit, total),
    },
  });
}

export async function getAllAuditLogs(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthRequest;

  if (authReq.user.role !== "ADMIN") {
    res.status(403).json({
      success: false,
      error: { message: "Only admins can access all audit logs" },
    });
    return;
  }

  const { userId, action, resource, startDate, endDate, page: rawPage, limit: rawLimit } = req.query;

  const page = Math.max(1, parseInt(String(rawPage ?? "1"), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(rawLimit ?? "50"), 10) || 50));

  const params: {
    userId?: string;
    action?: AuditAction;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
    page: number;
    limit: number;
  } = {
    page,
    limit,
  };

  if (userId) params.userId = String(userId);
  if (action) params.action = action as AuditAction;
  if (resource) params.resource = String(resource);
  if (startDate) params.startDate = new Date(String(startDate));
  if (endDate) params.endDate = new Date(String(endDate));

  const { logs, total } = await getAuditLogs(params);

  res.json({
    success: true,
    data: {
      logs,
      pagination: getPaginationMeta(page, limit, total),
    },
  });
}
