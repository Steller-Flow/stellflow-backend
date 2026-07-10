import { Router } from "express";
import {
  createInvoice,
  getInvoices,
  getInvoice,
  updateInvoice,
  deleteInvoice,
} from "../controllers/invoice.controller.js";
import { validate } from "../middleware/validate.js";
import { authenticate } from "../middleware/auth.js";
import { createInvoiceSchema, updateInvoiceSchema } from "../schemas/invoice.schema.js";

const router = Router();

router.use(authenticate);

router.post("/", validate(createInvoiceSchema), createInvoice);
router.get("/", getInvoices);
router.get("/:id", getInvoice);
router.put("/:id", validate(updateInvoiceSchema), updateInvoice);
router.delete("/:id", deleteInvoice);

export default router;
