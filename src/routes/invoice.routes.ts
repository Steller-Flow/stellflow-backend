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

router.post("/", authorize("FREELANCER"), validate(createInvoiceSchema), createInvoice);
router.get("/", validate(invoiceQuerySchema, "query"), getInvoices);
router.get("/:id", getInvoiceById);
router.patch("/:id", authorize("FREELANCER"), validate(updateInvoiceSchema), updateInvoice);
router.delete("/:id", authorize("FREELANCER"), deleteInvoice);

export default router;
