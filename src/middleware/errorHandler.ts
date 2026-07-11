import type { Request, Response, NextFunction } from "express";
import { AppError, ValidationError, InternalError } from "../utils/AppError.js";

interface ErrorLogContext {
  timestamp: string;
  method: string;
  path: string;
  ip: string;
  userId: string;
  statusCode: number;
  message: string;
  code: string;
  stack: string;
}

function formatErrorLog(err: Error, req: Request, statusCode: number): ErrorLogContext {
  const authReq = req as Request & { user?: { userId: string } };
  return {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.originalUrl,
    ip: (req.headers["x-forwarded-for"] as string) ?? req.socket.remoteAddress ?? "unknown",
    userId: authReq.user?.userId ?? "anonymous",
    statusCode,
    message: err.message,
    code: err instanceof AppError ? err.code : "UNKNOWN",
    stack: process.env["NODE_ENV"] !== "production" ? (err.stack ?? "") : "",
  };
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ValidationError) {
    const logContext = formatErrorLog(err, req, err.statusCode);
    console.error("[ERROR]", JSON.stringify(logContext));

    res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: err.code,
        errors: err.errors,
      },
    });
    return;
  }

  if (err instanceof AppError) {
    const logContext = formatErrorLog(err, req, err.statusCode);
    console.error("[ERROR]", JSON.stringify(logContext));

    res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: err.code,
      },
    });
    return;
  }

  const internalErr = new InternalError();
  const logContext = formatErrorLog(err, req, 500);
  console.error("[ERROR]", JSON.stringify(logContext));

  res.status(500).json({
    success: false,
    error: {
      message: internalErr.message,
      code: internalErr.code,
    },
  });
}
