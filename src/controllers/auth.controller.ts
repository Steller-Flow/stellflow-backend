import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
import { config } from "../config/index.js";
import { ConflictError, UnauthorizedError, NotFoundError } from "../utils/errors.js";
import type { AuthRequest } from "../middleware/auth.js";

function generateTokens(payload: { userId: string; email: string; role: string }) {
  const accessToken = jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
  const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });
  return { accessToken, refreshToken };
}

function setRefreshTokenCookie(res: Response, refreshToken: string): void {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: config.nodeEnv === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export async function register(req: Request, res: Response): Promise<void> {
  const { fullname, email, password, role, walletAddress, country } = req.body;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new ConflictError("Email already registered");
  }

  if (walletAddress) {
    const existingWallet = await prisma.user.findUnique({ where: { walletAddress } });
    if (existingWallet) {
      throw new ConflictError("Wallet address already registered");
    }
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      fullname,
      email,
      password: hashedPassword,
      role,
      ...(walletAddress != null && { walletAddress }),
      ...(country != null && { country }),
    },
    select: {
      id: true,
      fullname: true,
      email: true,
      role: true,
      walletAddress: true,
      country: true,
      isVerified: true,
      createdAt: true,
    },
  });

  const tokens = generateTokens({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  setRefreshTokenCookie(res, tokens.refreshToken);

  res.status(201).json({
    success: true,
    data: {
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    },
  });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.password) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const tokens = generateTokens({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  setRefreshTokenCookie(res, tokens.refreshToken);

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        fullname: user.fullname,
        email: user.email,
        role: user.role,
        walletAddress: user.walletAddress,
        country: user.country,
        isVerified: user.isVerified,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    },
  });
}

export function logout(_req: Request, res: Response): void {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: config.nodeEnv === "production",
    sameSite: "strict",
    path: "/",
  });

  res.json({
    success: true,
    data: { message: "Logged out successfully" },
  });
}

export async function refreshToken(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.refreshToken ?? req.body?.refreshToken;

  if (!token) {
    throw new UnauthorizedError("No refresh token provided");
  }

  let decoded: { userId: string; email: string; role: string };
  try {
    decoded = jwt.verify(token, config.jwt.refreshSecret) as { userId: string; email: string; role: string };
  } catch {
    throw new UnauthorizedError("Invalid or expired refresh token");
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
  if (!user) {
    throw new NotFoundError("User not found");
  }

  const tokens = generateTokens({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  setRefreshTokenCookie(res, tokens.refreshToken);

  res.json({
    success: true,
    data: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    },
  });
}

export async function getMe(req: Request, res: Response): Promise<void> {
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
    throw new NotFoundError("User not found");
  }

  res.json({
    success: true,
    data: { user },
  });
}
