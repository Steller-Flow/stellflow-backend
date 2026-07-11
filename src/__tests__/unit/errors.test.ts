import { describe, it, expect } from "vitest";
import {
  AppError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  BadRequestError,
  ConflictError,
} from "../../utils/errors.js";

describe("Error Classes", () => {
  describe("AppError", () => {
    it("should create error with message and status code", () => {
      const error = new AppError("Test error", 500);
      expect(error.message).toBe("Test error");
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
      expect(error).toBeInstanceOf(Error);
    });

    it("should set isOperational to false when specified", () => {
      const error = new AppError("System error", 500, false);
      expect(error.isOperational).toBe(false);
    });
  });

  describe("NotFoundError", () => {
    it("should have status 404 and default message", () => {
      const error = new NotFoundError();
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe("Resource not found");
    });

    it("should accept custom message", () => {
      const error = new NotFoundError("User not found");
      expect(error.message).toBe("User not found");
    });
  });

  describe("UnauthorizedError", () => {
    it("should have status 401 and default message", () => {
      const error = new UnauthorizedError();
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe("Unauthorized");
    });

    it("should accept custom message", () => {
      const error = new UnauthorizedError("Invalid token");
      expect(error.message).toBe("Invalid token");
    });
  });

  describe("ForbiddenError", () => {
    it("should have status 403 and default message", () => {
      const error = new ForbiddenError();
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe("Forbidden");
    });

    it("should accept custom message", () => {
      const error = new ForbiddenError("Insufficient permissions");
      expect(error.message).toBe("Insufficient permissions");
    });
  });

  describe("BadRequestError", () => {
    it("should have status 400 and default message", () => {
      const error = new BadRequestError();
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe("Bad request");
    });

    it("should accept custom message", () => {
      const error = new BadRequestError("Invalid input");
      expect(error.message).toBe("Invalid input");
    });
  });

  describe("ConflictError", () => {
    it("should have status 409 and default message", () => {
      const error = new ConflictError();
      expect(error.statusCode).toBe(409);
      expect(error.message).toBe("Resource already exists");
    });

    it("should accept custom message", () => {
      const error = new ConflictError("Email already registered");
      expect(error.message).toBe("Email already registered");
    });
  });
});
