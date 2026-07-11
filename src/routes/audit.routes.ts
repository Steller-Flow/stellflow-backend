import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import {
  getAuditLogById,
  getUserAuditLogs,
  getAllAuditLogs,
} from "../controllers/audit.controller.js";

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /api/audit-logs:
 *   get:
 *     tags: [Audit Logs]
 *     summary: Get all audit logs (admin only)
 *     description: Retrieve paginated audit logs with filtering (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filter by audit action
 *       - in: query
 *         name: resource
 *         schema:
 *           type: string
 *         description: Filter by resource type
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Paginated audit logs
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin only
 */
router.get("/", authorize("ADMIN"), getAllAuditLogs);

/**
 * @openapi
 * /api/audit-logs/my:
 *   get:
 *     tags: [Audit Logs]
 *     summary: Get my audit logs
 *     description: Get paginated audit logs for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *       - in: query
 *         name: resource
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Paginated user audit logs
 *       401:
 *         description: Unauthorized
 */
router.get("/my", getUserAuditLogs);

/**
 * @openapi
 * /api/audit-logs/{id}:
 *   get:
 *     tags: [Audit Logs]
 *     summary: Get audit log by ID
 *     description: Get a single audit log entry
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
 *         description: Audit log details
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: No access
 *       404:
 *         description: Audit log not found
 */
router.get("/:id", getAuditLogById);

export default router;
