import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import sharp from "sharp";
import { config } from "../config/index.js";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const AVATAR_SIZES = {
  thumbnail: { width: 64, height: 64 },
  small: { width: 128, height: 128 },
  medium: { width: 256, height: 256 },
};

const s3Client = new S3Client({
  region: config.s3.region,
  endpoint: config.s3.endpoint,
  forcePathStyle: config.s3.forcePathStyle,
  credentials: {
    accessKeyId: config.s3.accessKeyId,
    secretAccessKey: config.s3.secretAccessKey,
  },
});

export function validateFileType(mimetype: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimetype);
}

export function validateFileSize(size: number): boolean {
  return size <= MAX_FILE_SIZE;
}

export async function resizeAvatar(buffer: Buffer): Promise<{ thumbnail: Buffer; small: Buffer; medium: Buffer }> {
  const [thumbnail, small, medium] = await Promise.all([
    sharp(buffer).resize(AVATAR_SIZES.thumbnail).png().toBuffer(),
    sharp(buffer).resize(AVATAR_SIZES.small).png().toBuffer(),
    sharp(buffer).resize(AVATAR_SIZES.medium).png().toBuffer(),
  ]);

  return { thumbnail, small, medium };
}

export async function uploadToS3(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: config.s3.bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await s3Client.send(command);
  return `https://${config.s3.bucket}.s3.${config.s3.region}.amazonaws.com/${key}`;
}

export async function getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: config.s3.bucket,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

export function generateFileKey(userId: string, filename: string, type: "avatar" | "invoice"): string {
  const timestamp = Date.now();
  const ext = filename.split(".").pop();
  return `${type}s/${userId}/${timestamp}.${ext}`;
}
