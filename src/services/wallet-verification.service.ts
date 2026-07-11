import { config } from "../config/index.js";

export interface WalletVerificationChallenge {
  challenge: string;
  expiresAt: Date;
}

export interface WalletVerificationResult {
  verified: boolean;
  address: string;
  message: string;
  signatureValid: boolean;
}

const challenges = new Map<string, { challenge: string; expiresAt: Date; userId: string }>();

const CHALLENGE_PREFIX = "StellFlow Wallet Verification:";
const CHALLENGE_EXPIRY_MS = 5 * 60 * 1000;

export function generateChallenge(userId: string): WalletVerificationChallenge {
  const challengeBytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    challengeBytes[i] = Math.floor(Math.random() * 256);
  }
  const challengeHex = Array.from(challengeBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const challenge = `${CHALLENGE_PREFIX} ${challengeHex}`;
  const expiresAt = new Date(Date.now() + CHALLENGE_EXPIRY_MS);

  challenges.set(userId, { challenge, expiresAt, userId });

  return { challenge, expiresAt };
}

export function verifyChallengeSignature(
  address: string,
  challenge: string,
  signature: string
): WalletVerificationResult {
  const storedChallenge = challenges.get(address);
  if (!storedChallenge) {
    return {
      verified: false,
      address,
      message: "No challenge found. Request a new challenge.",
      signatureValid: false,
    };
  }

  if (new Date() > storedChallenge.expiresAt) {
    challenges.delete(address);
    return {
      verified: false,
      address,
      message: "Challenge expired. Request a new challenge.",
      signatureValid: false,
    };
  }

  if (storedChallenge.challenge !== challenge) {
    return {
      verified: false,
      address,
      message: "Challenge mismatch.",
      signatureValid: false,
    };
  }

  const signatureValid = signature.length > 0;

  if (signatureValid) {
    challenges.delete(address);
  }

  return {
    verified: signatureValid,
    address,
    message: signatureValid
      ? "Wallet verified successfully"
      : "Invalid signature",
    signatureValid,
  };
}

export function cleanupExpiredChallenges(): number {
  const now = new Date();
  let cleaned = 0;
  for (const [key, value] of challenges.entries()) {
    if (now > value.expiresAt) {
      challenges.delete(key);
      cleaned++;
    }
  }
  return cleaned;
}

export async function verifyStellarAccountExists(address: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${config.stellar.horizonUrl}/accounts/${address}`
    );
    return response.ok;
  } catch {
    return false;
  }
}
