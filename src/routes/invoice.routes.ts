import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createInvoiceSchema, updateInvoiceSchema, invoiceQuerySchema } from "../validators/invoice.schema.js";
import {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
} from "../controllers/invoice.controller.js";

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /api/invoices:
 *   post:
 *     tags: [Invoices]
 *     summary: Create an invoice
 *     description: Create a new invoice (freelancers only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateInvoiceRequest'
 *     responses:
 *       201:
 *         description: Invoice created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only freelancers can create invoices
 */
router.post("/", validate(createInvoiceSchema), createInvoice);

/**
 * @openapi
 * /api/invoices:
 *   get:
 *     tags: [Invoices]
 *     summary: List invoices
 *     description: Get paginated list of invoices for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, PENDING, FUNDED, IN_ESCROW, COMPLETED, CANCELLED, DISPUTED]
 *         description: Filter by status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in title and description
 *     responses:
 *       200:
 *         description: Paginated invoice list
 *       401:
 *         description: Unauthorized
 */
router.get("/", getInvoices);

/**
 * @openapi
 * /api/invoices/{id}:
 *   get:
 *     tags: [Invoices]
 *     summary: Get invoice by ID
 *     description: Get a single invoice with details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Invoice ID
 *     responses:
 *       200:
 *         description: Invoice details
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: No access to this invoice
 *       404:
 *         description: Invoice not found
 */
router.get("/:id", getInvoice);

/**
 * @openapi
 * /api/invoices/{id}:
 *   put:
 *     tags: [Invoices]
 *     summary: Update an invoice
 *     description: Update invoice fields (creator only). Status transitions are validated.
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
 *             $ref: '#/components/schemas/CreateInvoiceRequest'
 *     responses:
 *       200:
 *         description: Invoice updated
 *       400:
 *         description: Invalid status transition
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only creator can update
 *       404:
 *         description: Invoice not found
 */
router.put("/:id", validate(updateInvoiceSchema), updateInvoice);

/**
 * @openapi
 * /api/invoices/{id}:
 *   delete:
 *     tags: [Invoices]
 *     summary: Delete an invoice
 *     description: Delete a draft invoice (creator only)
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
 *         description: Invoice deleted
 *       400:
 *         description: Only draft invoices can be deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only creator can delete
 *       404:
 *         description: Invoice not found
 */
router.delete("/:id", deleteInvoice);

export default router;
