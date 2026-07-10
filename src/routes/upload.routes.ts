import { Router } from "express";
import multer from "multer";
import { authenticate } from "../middleware/auth.js";
import {
  uploadAvatar,
  uploadInvoiceAttachment,
  getUploadUrl,
} from "../controllers/upload.controller.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const router = Router();

router.use(authenticate);

router.post("/avatar", upload.single("file"), uploadAvatar);
router.post("/invoice/:invoiceId", upload.single("file"), uploadInvoiceAttachment);
router.get("/presigned-url", getUploadUrl);

export default router;
