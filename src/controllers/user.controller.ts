import type { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { NotFoundError, ForbiddenError } from "../utils/AppError.js";
import type { AuthRequest } from "../middleware/auth.js";
import { logAuditFromRequest } from "../services/audit.service.js";

function calculateProfileCompleteness(user: {
  fullname: string;
  email: string;
  profileImage: string | null;
  country: string | null;
  walletAddress: string | null;
}): number {
  const fields = [user.fullname, user.email, user.profileImage, user.country, user.walletAddress];
  const filled = fields.filter((f) => f !== null && f !== "").length;
  return Math.round((filled / fields.length) * 100);
}

export async function getProfile(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthRequest;
  const user = await prisma.user.findUnique({
    where: { id: authReq.user.userId },
    select: {
      id: true,
      fullname: true,
      email: true,
      role: true,
      walletAddress: true,
      profileImage: true,
      country: true,
      isVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new NotFoundError("User");
  }

  const completeness = calculateProfileCompleteness(user);

  res.json({
    success: true,
    data: {
      user,
      profileCompleteness: completeness,
    },
  });
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthRequest;
  const { fullname, email, country, walletAddress, profileImage } = req.body;

  if (email) {
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        id: { not: authReq.user.userId },
      },
    });
    if (existingUser) {
      throw new ForbiddenError("Email already in use");
    }
  }

  if (walletAddress) {
    const existingWallet = await prisma.user.findFirst({
      where: {
        walletAddress,
        id: { not: authReq.user.userId },
      },
    });
    if (existingWallet) {
      throw new ForbiddenError("Wallet address already in use");
    }
  }

  const user = await prisma.user.update({
    where: { id: authReq.user.userId },
    data: {
      ...(fullname != null && { fullname }),
      ...(email != null && { email }),
      ...(country != null && { country }),
      ...(walletAddress != null && { walletAddress }),
      ...(profileImage != null && { profileImage }),
    },
    select: {
      id: true,
      fullname: true,
      email: true,
      role: true,
      walletAddress: true,
      profileImage: true,
      country: true,
      isVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const completeness = calculateProfileCompleteness(user);

  const changedFields: string[] = [];
  if (fullname) changedFields.push("fullname");
  if (email) changedFields.push("email");
  if (country) changedFields.push("country");
  if (walletAddress) changedFields.push("walletAddress");
  if (profileImage) changedFields.push("profileImage");

  await logAuditFromRequest(req, {
    userId: authReq.user.userId,
    action: "ACCOUNT_UPDATED",
    resource: "User",
    resourceId: authReq.user.userId,
    description: `Profile updated: ${changedFields.join(", ")}`,
    metadata: { changedFields: changedFields.join(",") },
  });

  res.json({
    success: true,
    data: {
      user,
      profileCompleteness: completeness,
    },
  });
}

export async function deleteProfile(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthRequest;

  const user = await prisma.user.findUnique({ where: { id: authReq.user.userId } });
  if (!user) {
    throw new NotFoundError("User");
  }

  await logAuditFromRequest(req, {
    userId: authReq.user.userId,
    action: "ACCOUNT_DELETED",
    resource: "User",
    resourceId: authReq.user.userId,
    description: `Account deleted: ${user.email}`,
    metadata: { email: user.email },
  });

  await prisma.user.delete({ where: { id: authReq.user.userId } });

  res.json({
    success: true,
    data: { message: "Profile deleted successfully" },
  });
}

export async function uploadAvatar(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthRequest;
  const { profileImage } = req.body;

  const user = await prisma.user.update({
    where: { id: authReq.user.userId },
    data: { profileImage },
    select: {
      id: true,
      fullname: true,
      email: true,
      role: true,
      walletAddress: true,
      profileImage: true,
      country: true,
      isVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  res.json({
    success: true,
    data: { user },
  });
}
