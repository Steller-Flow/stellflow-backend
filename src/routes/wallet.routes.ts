import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  requestChallengeSchema,
  verifyWalletSchema,
} from "../validators/wallet.schema.js";
import {
  requestChallenge,
  verifyWallet,
  unlinkWallet,
} from "../controllers/wallet.controller.js";

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /api/wallet/challenge:
 *   post:
 *     tags: [Wallet]
 *     summary: Request wallet verification challenge
 *     description: Generate a challenge message for the user to sign with their Stellar wallet
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RequestChallengeRequest'
 *     responses:
 *       200:
 *         description: Challenge generated
 *       400:
 *         description: Invalid wallet address or account not found
 *       401:
 *         description: Unauthorized
 */
router.post("/challenge", validate(requestChallengeSchema), requestChallenge);

/**
 * @openapi
 * /api/wallet/verify:
 *   post:
 *     tags: [Wallet]
 *     summary: Verify wallet ownership
 *     description: Verify a signed challenge and link the wallet to the user account
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VerifyWalletRequest'
 *     responses:
 *       200:
 *         description: Wallet verified and linked
 *       400:
 *         description: Invalid signature or challenge
 *       401:
 *         description: Unauthorized
 */
router.post("/verify", validate(verifyWalletSchema), verifyWallet);

/**
 * @openapi
 * /api/wallet/unlink:
 *   post:
 *     tags: [Wallet]
 *     summary: Unlink wallet
 *     description: Remove the linked wallet from the user account
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet unlinked
 *       400:
 *         description: No wallet linked
 *       401:
 *         description: Unauthorized
 */
router.post("/unlink", unlinkWallet);

export default router;
