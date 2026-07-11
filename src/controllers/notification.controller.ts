import type { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { NotFoundError, ForbiddenError } from "../utils/AppError.js";
import type { AuthRequest } from "../middleware/auth.js";
import { getPaginationParams, getPaginationMeta, getSkipTake } from "../utils/pagination.js";
import { getIO } from "../services/socket.service.js";
import type { CreateNotificationInput, MarkAsReadInput } from "../validators/notification.schema.js";

export async function createNotification(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthRequest;
  const { userId, title, message, type } = req.body as CreateNotificationInput;

  if (authReq.user.role !== "ADMIN" && authReq.user.userId !== userId) {
    throw new ForbiddenError("You can only create notifications for yourself");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new NotFoundError("User");
  }

  const notification = await prisma.notification.create({
    data: {
      userId,
      title,
      message,
      type,
    },
    include: {
      user: {
        select: { id: true, fullname: true, email: true },
      },
    },
  });

  const io = getIO();
  if (io) {
    io.to(`user:${userId}`).emit("notification:new", {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
    });
  }

  res.status(201).json({
    success: true,
    data: { notification },
  });
}

export async function getNotifications(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthRequest;
  const { page: rawPage, limit: rawLimit, type, isRead, sortBy, sortOrder } = req.query;

  const pagination = getPaginationParams({
    page: String(rawPage ?? ""),
    limit: String(rawLimit ?? ""),
  });
  const { skip, take } = getSkipTake(pagination.page, pagination.limit);

  const where: Record<string, unknown> = {};
  where.userId = authReq.user.userId;

  if (type) where.type = String(type);
  if (isRead !== undefined) where.isRead = isRead === "true";

  const orderBy: Record<string, string> = {};
  const sortField = String(sortBy ?? "createdAt");
  orderBy[sortField] = String(sortOrder ?? "desc");

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      skip,
      take,
      orderBy,
    }),
    prisma.notification.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      notifications,
      pagination: getPaginationMeta(pagination.page, pagination.limit, total),
    },
  });
}

export async function getNotificationById(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthRequest;
  const id = String(req.params["id"]);

  const notification = await prisma.notification.findUnique({
    where: { id },
    include: {
      user: {
        select: { id: true, fullname: true, email: true },
      },
    },
  });

  if (!notification) {
    throw new NotFoundError("Notification");
  }

  if (notification.userId !== authReq.user.userId && authReq.user.role !== "ADMIN") {
    throw new ForbiddenError("You don't have access to this notification");
  }

  res.json({
    success: true,
    data: { notification },
  });
}

export async function markAsRead(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthRequest;
  const { notificationIds } = req.body as MarkAsReadInput;

  const notifications = await prisma.notification.findMany({
    where: {
      id: { in: notificationIds },
      userId: authReq.user.userId,
    },
  });

  if (notifications.length !== notificationIds.length) {
    throw new NotFoundError("One or more notifications");
  }

  await prisma.notification.updateMany({
    where: {
      id: { in: notificationIds },
      userId: authReq.user.userId,
    },
    data: { isRead: true },
  });

  const io = getIO();
  if (io) {
    io.to(`user:${authReq.user.userId}`).emit("notification:read", {
      notificationIds,
    });
  }

  res.json({
    success: true,
    data: { message: "Notifications marked as read" },
  });
}

export async function markAllAsRead(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthRequest;

  const result = await prisma.notification.updateMany({
    where: {
      userId: authReq.user.userId,
      isRead: false,
    },
    data: { isRead: true },
  });

  const io = getIO();
  if (io) {
    io.to(`user:${authReq.user.userId}`).emit("notification:allRead", {
      count: result.count,
    });
  }

  res.json({
    success: true,
    data: {
      message: "All notifications marked as read",
      count: result.count,
    },
  });
}

export async function deleteNotification(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthRequest;
  const id = String(req.params["id"]);

  const notification = await prisma.notification.findUnique({ where: { id } });

  if (!notification) {
    throw new NotFoundError("Notification");
  }

  if (notification.userId !== authReq.user.userId && authReq.user.role !== "ADMIN") {
    throw new ForbiddenError("You don't have access to this notification");
  }

  await prisma.notification.delete({ where: { id } });

  res.json({
    success: true,
    data: { message: "Notification deleted successfully" },
  });
}

export async function getUnreadCount(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthRequest;

  const count = await prisma.notification.count({
    where: {
      userId: authReq.user.userId,
      isRead: false,
    },
  });

  res.json({
    success: true,
    data: { count },
  });
}
