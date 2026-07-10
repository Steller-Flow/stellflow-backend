import { Router } from "express";
import { getProfile, updateProfile, deleteProfile, uploadAvatar } from "../controllers/user.controller.js";
import { validate } from "../middleware/validate.js";
import { authenticate } from "../middleware/auth.js";
import { updateProfileSchema, avatarUploadSchema } from "../schemas/user.schema.js";

const router = Router();

router.use(authenticate);

router.get("/profile", getProfile);
router.put("/profile", validate(updateProfileSchema), updateProfile);
router.delete("/profile", deleteProfile);
router.post("/avatar", validate(avatarUploadSchema), uploadAvatar);

export default router;
