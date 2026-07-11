import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  createNotificationSchema,
  markAsReadSchema,
  notificationQuerySchema,
} from "../validators/notification.schema.js";
import {
  createNotification,
  getNotifications,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
} from "../controllers/notification.controller.js";

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /api/notifications:
 *   post:
 *     tags: [Notifications]
 *     summary: Create a notification
 *     description: Create a new notification (admin or self)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateNotificationRequest'
 *     responses:
 *       201:
 *         description: Notification created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
router.post("/", validate(createNotificationSchema), createNotification);

/**
 * @openapi
 * /api/notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: List notifications
 *     description: Get paginated list of notifications for the authenticated user
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
 *         name: type
 *         schema:
 *           type: string
 *           enum: [PAYMENT_RECEIVED, ESCROW_FUNDED, INVOICE_SENT, ESCROW_RELEASED]
 *       - in: query
 *         name: isRead
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Paginated notification list
 *       401:
 *         description: Unauthorized
 */
router.get("/", validate(notificationQuerySchema, "query"), getNotifications);

/**
 * @openapi
 * /api/notifications/unread-count:
 *   get:
 *     tags: [Notifications]
 *     summary: Get unread count
 *     description: Get the count of unread notifications for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread notification count
 *       401:
 *         description: Unauthorized
 */
router.get("/unread-count", getUnreadCount);

/**
 * @openapi
 * /api/notifications/mark-read:
 *   post:
 *     tags: [Notifications]
 *     summary: Mark notifications as read
 *     description: Mark specific notifications as read
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *     responses:
 *       200:
 *         description: Notifications marked as read
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post("/mark-read", validate(markAsReadSchema), markAsRead);

/**
 * @openapi
 * /api/notifications/mark-all-read:
 *   post:
 *     tags: [Notifications]
 *     summary: Mark all notifications as read
 *     description: Mark all unread notifications as read for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 *       401:
 *         description: Unauthorized
 */
router.post("/mark-all-read", markAllAsRead);

/**
 * @openapi
 * /api/notifications/{id}:
 *   get:
 *     tags: [Notifications]
 *     summary: Get notification by ID
 *     description: Get a single notification
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
 *         description: Notification details
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: No access
 *       404:
 *         description: Notification not found
 */
router.get("/:id", getNotificationById);

/**
 * @openapi
 * /api/notifications/{id}:
 *   delete:
 *     tags: [Notifications]
 *     summary: Delete a notification
 *     description: Delete a notification (owner or admin)
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
 *         description: Notification deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: No access
 *       404:
 *         description: Notification not found
 */
router.delete("/:id", deleteNotification);

export default router;
