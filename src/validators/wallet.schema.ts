import { z } from "zod";

export const requestChallengeSchema = z.object({
  walletAddress: z
    .string()
    .min(1, "Wallet address is required")
    .regex(/^G[A-Z0-9]{55}$/, "Invalid Stellar wallet address format"),
});

export const verifyWalletSchema = z.object({
  walletAddress: z
    .string()
    .min(1, "Wallet address is required")
    .regex(/^G[A-Z0-9]{55}$/, "Invalid Stellar wallet address format"),
  challenge: z.string().min(1, "Challenge is required"),
  signature: z.string().min(1, "Signature is required"),
});

export const unlinkWalletSchema = z.object({
  walletAddress: z
    .string()
    .min(1, "Wallet address is required"),
});

export type RequestChallengeInput = z.infer<typeof requestChallengeSchema>;
export type VerifyWalletInput = z.infer<typeof verifyWalletSchema>;
export type UnlinkWalletInput = z.infer<typeof unlinkWalletSchema>;
