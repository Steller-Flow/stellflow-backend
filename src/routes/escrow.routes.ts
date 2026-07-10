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

router.post("/", validate(createEscrowSchema), createEscrow);
router.get("/:id", getEscrow);
router.post("/:id/fund", validate(fundEscrowSchema), fundEscrow);
router.post("/:id/release", validate(releaseEscrowSchema), releaseEscrow);
router.post("/:id/refund", validate(refundEscrowSchema), refundEscrow);

export default router;
