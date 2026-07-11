import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../../config/prisma.js";
import * as authController from "../../controllers/auth.controller.js";
import { mockUser } from "../fixtures/index.js";

vi.mock("jsonwebtoken", () => ({
  default: {
    sign: vi.fn().mockReturnValue("mock-jwt-token"),
    verify: vi.fn().mockReturnValue({ userId: "clx1234567890", email: "john@example.com", role: "FREELANCER" }),
    TokenExpiredError: class TokenExpiredError extends Error {},
    JsonWebTokenError: class JsonWebTokenError extends Error {},
  },
}));

function mockReq(body: Record<string, unknown> = {}, cookies: Record<string, string> = {}): Request {
  return {
    body,
    cookies,
    headers: {},
    params: {},
    query: {},
    ip: "127.0.0.1",
    socket: { remoteAddress: "127.0.0.1" },
  } as unknown as Request;
}

function mockRes(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    cookie: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

describe("Auth Controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("register", () => {
    it("should register a new user", async () => {
      const hashedPassword = await bcrypt.hash("password123", 12);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockResolvedValue({
        ...mockUser,
        password: hashedPassword,
      });

      const req = mockReq({
        fullname: "John Doe",
        email: "john@example.com",
        password: "password123",
        role: "FREELANCER",
      });
      const res = mockRes();

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            user: expect.objectContaining({ email: "john@example.com" }),
          }),
        })
      );
    });

    it("should throw ConflictError for existing email", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);

      const req = mockReq({
        fullname: "John Doe",
        email: "john@example.com",
        password: "password123",
        role: "FREELANCER",
      });
      const res = mockRes();

      await expect(authController.register(req, res)).rejects.toThrow("Email already registered");
    });
  });

  describe("login", () => {
    it("should login with valid credentials", async () => {
      const hashedPassword = await bcrypt.hash("password123", 12);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...mockUser,
        password: hashedPassword,
      });

      const req = mockReq({ email: "john@example.com", password: "password123" });
      const res = mockRes();

      await authController.login(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            accessToken: expect.any(String),
          }),
        })
      );
    });

    it("should throw UnauthorizedError for invalid email", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const req = mockReq({ email: "nonexistent@example.com", password: "password123" });
      const res = mockRes();

      await expect(authController.login(req, res)).rejects.toThrow("Invalid email or password");
    });

    it("should throw UnauthorizedError for wrong password", async () => {
      const hashedPassword = await bcrypt.hash("wrongpassword", 12);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...mockUser,
        password: hashedPassword,
      });

      const req = mockReq({ email: "john@example.com", password: "password123" });
      const res = mockRes();

      await expect(authController.login(req, res)).rejects.toThrow("Invalid email or password");
    });
  });

  describe("logout", () => {
    it("should clear refresh token cookie", () => {
      const req = mockReq();
      const res = mockRes();

      authController.logout(req, res);

      expect(res.clearCookie).toHaveBeenCalledWith("refreshToken", expect.any(Object));
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { message: "Logged out successfully" },
      });
    });
  });

  describe("getMe", () => {
    it("should return current user profile", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);

      const req = mockReq();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (req as any).user = { userId: "clx1234567890" };
      const res = mockRes();

      await authController.getMe(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            user: expect.objectContaining({ email: "john@example.com" }),
          }),
        })
      );
    });

    it("should throw NotFoundError for non-existent user", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const req = mockReq();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (req as any).user = { userId: "nonexistent" };
      const res = mockRes();

      await expect(authController.getMe(req, res)).rejects.toThrow("User not found");
    });
  });
});
