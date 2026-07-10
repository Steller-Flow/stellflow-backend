import { z } from "zod";

export const updateProfileSchema = z.object({
  fullname: z.string().min(2).optional(),
  email: z.string().email().optional(),
  country: z.string().optional(),
  walletAddress: z.string().optional(),
  profileImage: z.string().url().optional(),
});

export const avatarUploadSchema = z.object({
  profileImage: z.string().url("Invalid image URL"),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type AvatarUploadInput = z.infer<typeof avatarUploadSchema>;
