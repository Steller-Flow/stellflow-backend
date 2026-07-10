import type { Request, Response, NextFunction } from "express";
import { AppError, ValidationError } from "../utils/AppError.js";

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ValidationError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        errors: err.errors,
      },
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: { message: err.message },
    });
    return;
  }

  console.error("Unexpected error:", err);
  res.status(500).json({
    success: false,
    error: { message: "Internal server error" },
  });
}
