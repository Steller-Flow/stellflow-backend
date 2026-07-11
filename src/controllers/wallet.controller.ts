import type { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { NotFoundError, BadRequestError } from "../utils/AppError.js";
import type { AuthRequest } from "../middleware/auth.js";
import {
  generateChallenge,
  verifyChallengeSignature,
  verifyStellarAccountExists,
} from "../services/wallet-verification.service.js";
import { logAuditFromRequest } from "../services/audit.service.js";

export async function requestChallenge(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthRequest;
  const { walletAddress } = req.body;

  const accountExists = await verifyStellarAccountExists(walletAddress);
  if (!accountExists) {
    throw new BadRequestError("Stellar account not found on the network");
  }

  const existingWallet = await prisma.user.findFirst({
    where: {
      walletAddress,
      id: { not: authReq.user.userId },
    },
  });

  if (existingWallet) {
    throw new BadRequestError("Wallet address is already linked to another account");
  }

  const { challenge, expiresAt } = generateChallenge(walletAddress);

  res.json({
    success: true,
    data: {
      challenge,
      expiresAt,
      walletAddress,
    },
  });
}

export async function verifyWallet(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthRequest;
  const { walletAddress, challenge, signature } = req.body;

  const accountExists = await verifyStellarAccountExists(walletAddress);
  if (!accountExists) {
    throw new BadRequestError("Stellar account not found on the network");
  }

  const result = verifyChallengeSignature(walletAddress, challenge, signature);

  if (!result.verified) {
    throw new BadRequestError(result.message);
  }

  const updatedUser = await prisma.user.update({
    where: { id: authReq.user.userId },
    data: { walletAddress },
    select: {
      id: true,
      fullname: true,
      email: true,
      walletAddress: true,
      role: true,
    },
  });

  await logAuditFromRequest(req, {
    userId: authReq.user.userId,
    action: "WALLET_VERIFIED",
    resource: "User",
    resourceId: authReq.user.userId,
    description: `Wallet ${walletAddress} verified and linked`,
    metadata: { walletAddress },
  });

  res.json({
    success: true,
    data: {
      user: updatedUser,
      message: "Wallet verified and linked successfully",
    },
  });
}

export async function unlinkWallet(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthRequest;

  const user = await prisma.user.findUnique({
    where: { id: authReq.user.userId },
    select: { id: true, walletAddress: true },
  });

  if (!user) {
    throw new NotFoundError("User");
  }

  if (!user.walletAddress) {
    throw new BadRequestError("No wallet linked to this account");
  }

  const previousWallet = user.walletAddress;

  const updatedUser = await prisma.user.update({
    where: { id: authReq.user.userId },
    data: { walletAddress: null },
    select: {
      id: true,
      fullname: true,
      email: true,
      walletAddress: true,
      role: true,
    },
  });

  await logAuditFromRequest(req, {
    userId: authReq.user.userId,
    action: "WALLET_UNLINKED",
    resource: "User",
    resourceId: authReq.user.userId,
    description: `Wallet ${previousWallet} unlinked from account`,
    metadata: { previousWallet },
  });

  res.json({
    success: true,
    data: {
      user: updatedUser,
      message: "Wallet unlinked successfully",
    },
  });
}
