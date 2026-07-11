import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  getDashboardOverview,
  getMonthlyRevenue,
  getTransactionVolume,
  getEscrowAnalytics,
  getEarningsByPeriod,
} from "../controllers/analytics.controller.js";

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /api/analytics/overview:
 *   get:
 *     tags: [Analytics]
 *     summary: Dashboard overview
 *     description: Get aggregated dashboard data including earnings, pending payments, and escrow summaries
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard overview data
 *       401:
 *         description: Unauthorized
 */
router.get("/overview", getDashboardOverview);

/**
 * @openapi
 * /api/analytics/monthly-revenue:
 *   get:
 *     tags: [Analytics]
 *     summary: Monthly revenue chart
 *     description: Get monthly revenue data for chart visualization
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering (ISO 8601)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering (ISO 8601)
 *     responses:
 *       200:
 *         description: Monthly revenue chart data
 *       401:
 *         description: Unauthorized
 */
router.get("/monthly-revenue", getMonthlyRevenue);

/**
 * @openapi
 * /api/analytics/transaction-volume:
 *   get:
 *     tags: [Analytics]
 *     summary: Transaction volume
 *     description: Get transaction volume statistics with status breakdown
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *     responses:
 *       200:
 *         description: Transaction volume statistics
 *       401:
 *         description: Unauthorized
 */
router.get("/transaction-volume", getTransactionVolume);

/**
 * @openapi
 * /api/analytics/escrow:
 *   get:
 *     tags: [Analytics]
 *     summary: Escrow analytics
 *     description: Get escrow analytics with status breakdown and amounts
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *     responses:
 *       200:
 *         description: Escrow analytics data
 *       401:
 *         description: Unauthorized
 */
router.get("/escrow", getEscrowAnalytics);

/**
 * @openapi
 * /api/analytics/earnings:
 *   get:
 *     tags: [Analytics]
 *     summary: Earnings by period
 *     description: Get earnings breakdown including payment and escrow earnings
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *     responses:
 *       200:
 *         description: Earnings data
 *       401:
 *         description: Unauthorized
 */
router.get("/earnings", getEarningsByPeriod);

export default router;
