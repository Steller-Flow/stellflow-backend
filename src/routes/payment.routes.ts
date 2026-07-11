import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  createPaymentSchema,
  verifyPaymentSchema,
  paymentQuerySchema,
  paymentWebhookSchema,
} from "../validators/payment.schema.js";
import {
  createPayment,
  getPayments,
  getPaymentById,
  verifyPayment,
  handlePaymentWebhook,
} from "../controllers/payment.controller.js";

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /api/payments:
 *   post:
 *     tags: [Payments]
 *     summary: Record a payment
 *     description: Record an on-chain Stellar/USDC payment transaction
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePaymentRequest'
 *     responses:
 *       201:
 *         description: Payment recorded
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Duplicate transaction hash
 */
router.post("/", validate(createPaymentSchema), createPayment);

/**
 * @openapi
 * /api/payments:
 *   get:
 *     tags: [Payments]
 *     summary: List payments
 *     description: Get paginated list of payments for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, SUCCESS, FAILED]
 *     responses:
 *       200:
 *         description: Paginated payment list
 *       401:
 *         description: Unauthorized
 */
router.get("/", validate(paymentQuerySchema, "query"), getPayments);

/**
 * @openapi
 * /api/payments/{id}:
 *   get:
 *     tags: [Payments]
 *     summary: Get payment by ID
 *     description: Get a single payment record with details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment details
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: No access to this payment
 *       404:
 *         description: Payment not found
 */
router.get("/:id", getPaymentById);

/**
 * @openapi
 * /api/payments/verify:
 *   post:
 *     tags: [Payments]
 *     summary: Verify a payment
 *     description: Verify a Stellar transaction and update payment status
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VerifyPaymentRequest'
 *     responses:
 *       200:
 *         description: Payment verified
 *       400:
 *         description: Transaction verification failed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Payment not found
 */
router.post("/verify", validate(verifyPaymentSchema), verifyPayment);

/**
 * @openapi
 * /api/payments/webhook:
 *   post:
 *     tags: [Payments]
 *     summary: Payment webhook
 *     description: Receive Stellar transaction confirmation webhook
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PaymentWebhookRequest'
 *     responses:
 *       200:
 *         description: Webhook processed
 *       400:
 *         description: Invalid webhook payload
 */
router.post("/webhook", validate(paymentWebhookSchema), handlePaymentWebhook);

export default router;
