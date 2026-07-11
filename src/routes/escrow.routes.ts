import { Router } from "express";
import {
  createEscrow,
  fundEscrow,
  releaseEscrow,
  refundEscrow,
  getEscrow,
} from "../controllers/escrow.controller.js";
import { validate } from "../middleware/validate.js";
import { authenticate } from "../middleware/auth.js";
import {
  createEscrowSchema,
  fundEscrowSchema,
  releaseEscrowSchema,
  refundEscrowSchema,
} from "../schemas/escrow.schema.js";

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /api/escrows:
 *   post:
 *     tags: [Escrows]
 *     summary: Create an escrow
 *     description: Create a new escrow contract for an invoice (clients only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateEscrowRequest'
 *     responses:
 *       201:
 *         description: Escrow created
 *       400:
 *         description: Validation error or escrow already exists
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only clients can create escrows
 *       404:
 *         description: Invoice not found
 */
router.post("/", validate(createEscrowSchema), createEscrow);

/**
 * @openapi
 * /api/escrows/{id}:
 *   get:
 *     tags: [Escrows]
 *     summary: Get escrow by ID
 *     description: Get escrow details including payment history
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Escrow ID
 *     responses:
 *       200:
 *         description: Escrow details
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: No access to this escrow
 *       404:
 *         description: Escrow not found
 */
router.get("/:id", getEscrow);

/**
 * @openapi
 * /api/escrows/{id}/fund:
 *   post:
 *     tags: [Escrows]
 *     summary: Fund an escrow
 *     description: Fund an escrow with a Stellar transaction (client only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FundEscrowRequest'
 *     responses:
 *       200:
 *         description: Escrow funded
 *       400:
 *         description: Cannot fund in current status
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only the client can fund
 *       404:
 *         description: Escrow not found
 */
router.post("/:id/fund", validate(fundEscrowSchema), fundEscrow);

/**
 * @openapi
 * /api/escrows/{id}/release:
 *   post:
 *     tags: [Escrows]
 *     summary: Release escrow funds
 *     description: Release escrow funds to the freelancer (freelancer or admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FundEscrowRequest'
 *     responses:
 *       200:
 *         description: Escrow released
 *       400:
 *         description: Cannot release in current status
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only freelancer or admin can release
 *       404:
 *         description: Escrow not found
 */
router.post("/:id/release", validate(releaseEscrowSchema), releaseEscrow);

/**
 * @openapi
 * /api/escrows/{id}/refund:
 *   post:
 *     tags: [Escrows]
 *     summary: Refund escrow
 *     description: Refund escrow funds to the client (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FundEscrowRequest'
 *     responses:
 *       200:
 *         description: Escrow refunded
 *       400:
 *         description: Cannot refund in current status
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only admins can refund
 *       404:
 *         description: Escrow not found
 */
router.post("/:id/refund", validate(refundEscrowSchema), refundEscrow);

export default router;
