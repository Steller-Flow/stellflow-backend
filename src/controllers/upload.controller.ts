import type { Request, Response, NextFunction } from "express";
import { prisma } from "../config/prisma.js";
import {
  validateFileType,
  validateFileSize,
  uploadToS3,
  resizeAvatar,
  generateFileKey,
  getPresignedUrl,
} from "../services/upload.service.js";
import { NotFoundError, ValidationError, ForbiddenError } from "../utils/AppError.js";

export async function uploadAvatar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) {
      throw new ValidationError({ file: ["No file provided"] });
    }

    if (!validateFileType(req.file.mimetype)) {
      throw new ValidationError({ file: ["Invalid file type. Allowed: JPEG, PNG, WebP, GIF"] });
    }

    if (!validateFileSize(req.file.size)) {
      throw new ValidationError({ file: ["File too large. Maximum size: 10MB"] });
    }

    const userId = req.user!.userId;
    const resized = await resizeAvatar(req.file.buffer);

    const uploadPromises = Object.entries(resized).map(([size, buffer]) => {
      const key = `avatars/${userId}/${size}.png`;
      return uploadToS3(key, buffer, "image/png");
    });

    const urls = await Promise.all(uploadPromises);

    await prisma.user.update({
      where: { id: userId },
      data: { profileImage: urls[1] ?? null },
    });

    res.json({
      success: true,
      data: {
        thumbnail: urls[0],
        small: urls[1],
        medium: urls[2],
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function uploadInvoiceAttachment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) {
      throw new ValidationError({ file: ["No file provided"] });
    }

    if (!validateFileType(req.file.mimetype)) {
      throw new ValidationError({ file: ["Invalid file type. Allowed: JPEG, PNG, WebP, GIF, PDF"] });
    }

    if (!validateFileSize(req.file.size)) {
      throw new ValidationError({ file: ["File too large. Maximum size: 10MB"] });
    }

    const invoiceId = req.params["invoiceId"] as string;
    const userId = req.user!.userId;

    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) {
      throw new NotFoundError("Invoice");
    }

    if (invoice.creatorId !== userId) {
      throw new ForbiddenError("Only the invoice creator can upload attachments");
    }

    const key = generateFileKey(userId, req.file.originalname, "invoice");
    const url = await uploadToS3(key, req.file.buffer, req.file.mimetype);

    res.json({
      success: true,
      data: {
        url,
        key,
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getUploadUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { filename, type } = req.query as { filename?: string; type?: string };
    const userId = req.user!.userId;

    if (!filename || !type) {
      throw new ValidationError({ filename: ["Required"], type: ["Required"] });
    }

    if (type !== "avatar" && type !== "invoice") {
      throw new ValidationError({ type: ["Must be 'avatar' or 'invoice'"] });
    }

    const key = generateFileKey(userId, filename, type as "avatar" | "invoice");
    const presignedUrl = await getPresignedUrl(key);

    res.json({
      success: true,
      data: { presignedUrl, key },
    });
  } catch (error) {
    next(error);
  }
}
