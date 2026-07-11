import type { Request, Response, NextFunction } from "express";
import sanitizeHtml from "sanitize-html";

const sanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: [],
  allowedAttributes: {},
  disallowedTagsMode: "discard",
};

function sanitizeString(value: string): string {
  return sanitizeHtml(value, sanitizeOptions).trim();
}

function sanitizeValue(value: unknown): unknown {
  if (typeof value === "string") {
    return sanitizeString(value);
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value !== null && typeof value === "object") {
    return sanitizeObject(value as Record<string, unknown>);
  }
  return value;
}

function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = sanitizeValue(value);
  }
  return sanitized;
}

const DANGEROUS_URL_PATTERNS = [
  /^javascript:/i,
  /^data:/i,
  /^vbscript:/i,
  /^file:/i,
];

function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  for (const pattern of DANGEROUS_URL_PATTERNS) {
    if (pattern.test(trimmed)) {
      return "";
    }
  }
  return trimmed;
}

export function sanitizeBody(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeObject(req.body as Record<string, unknown>);
  }
  next();
}

export function sanitizeQuery(req: Request, _res: Response, next: NextFunction): void {
  if (req.query && typeof req.query === "object") {
    const sanitized: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.query)) {
      const sanitizedValue = sanitizeValue(value);
      sanitized[key] = typeof sanitizedValue === "string" ? sanitizedValue : String(sanitizedValue ?? "");
    }
    req.query = sanitized;
  }
  next();
}

export function sanitizeParams(req: Request, _res: Response, next: NextFunction): void {
  if (req.params && typeof req.params === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(req.params)) {
      sanitized[key] = sanitizeValue(value);
    }
    req.params = sanitized as Record<string, string>;
  }
  next();
}

export function validateUrlField(fieldName: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const value = req.body?.[fieldName] as string | undefined;
    if (value) {
      const sanitized = sanitizeUrl(value);
      if (!sanitized) {
        res.status(400).json({
          success: false,
          error: `Invalid URL provided for ${fieldName}`,
        });
        return;
      }
      req.body[fieldName] = sanitized;
    }
    next();
  };
}

export const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;

export function validateFileSize(maxSize: number = MAX_UPLOAD_SIZE) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = req.headers["content-length"];
    if (contentLength && parseInt(contentLength, 10) > maxSize) {
      res.status(413).json({
        success: false,
        error: `File too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB`,
      });
      return;
    }
    next();
  };
}

export const ALLOWED_CONTENT_TYPES = [
  "application/json",
  "application/x-www-form-urlencoded",
];

export function validateContentType(allowedTypes: string[] = ALLOWED_CONTENT_TYPES) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentType = req.headers["content-type"];
    if (contentType && !allowedTypes.some((type) => contentType.includes(type))) {
      res.status(415).json({
        success: false,
        error: `Unsupported content type: ${contentType}`,
      });
      return;
    }
    next();
  };
}

export { sanitizeString, sanitizeUrl };
