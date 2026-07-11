import { Router } from "express";
import { getProfile, updateProfile, deleteProfile, uploadAvatar } from "../controllers/user.controller.js";
import { validate } from "../middleware/validate.js";
import { authenticate } from "../middleware/auth.js";
import { updateProfileSchema, avatarUploadSchema } from "../schemas/user.schema.js";
import { validateUrlField } from "../middleware/sanitize.js";

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /api/users/profile:
 *   get:
 *     tags: [Users]
 *     summary: Get user profile
 *     description: Get the authenticated user's full profile with completeness score
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile with completeness
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.get("/profile", getProfile);

/**
 * @openapi
 * /api/users/profile:
 *   put:
 *     tags: [Users]
 *     summary: Update user profile
 *     description: Update the authenticated user's profile fields
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullname:
 *                 type: string
 *                 minLength: 2
 *               email:
 *                 type: string
 *                 format: email
 *               country:
 *                 type: string
 *               walletAddress:
 *                 type: string
 *               profileImage:
 *                 type: string
 *                 format: uri
 *     responses:
 *       200:
 *         description: Profile updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Email or wallet already in use
 */
router.put("/profile", validate(updateProfileSchema), updateProfile);

/**
 * @openapi
 * /api/users/profile:
 *   delete:
 *     tags: [Users]
 *     summary: Delete user profile
 *     description: Permanently delete the authenticated user's account
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.delete("/profile", deleteProfile);

/**
 * @openapi
 * /api/users/avatar:
 *   post:
 *     tags: [Users]
 *     summary: Upload avatar
 *     description: Set or update the user's profile image URL
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [profileImage]
 *             properties:
 *               profileImage:
 *                 type: string
 *                 format: uri
 *                 description: URL of the profile image
 *     responses:
 *       200:
 *         description: Avatar updated
 *       400:
 *         description: Invalid image URL
 *       401:
 *         description: Unauthorized
 */
router.post("/avatar", validate(avatarUploadSchema), validateUrlField("profileImage"), uploadAvatar);

export default router;
