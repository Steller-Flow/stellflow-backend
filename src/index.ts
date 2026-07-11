import "dotenv/config";
import express from "express";
import { createServer } from "http";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import invoiceRoutes from "./routes/invoice.routes.js";
import escrowRoutes from "./routes/escrow.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import walletRoutes from "./routes/wallet.routes.js";
import auditRoutes from "./routes/audit.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { globalLimiter, apiLimiter } from "./middleware/rateLimiter.js";
import { sanitizeBody, sanitizeQuery, sanitizeParams, validateContentType } from "./middleware/sanitize.js";
import { initSocket } from "./services/socket.service.js";

const app = express();
const httpServer = createServer(app);
const PORT = process.env["PORT"] ?? 3001;

initSocket(httpServer);

app.use(helmet());
app.use(cors({ origin: process.env["CORS_ORIGIN"] ?? "http://localhost:3000", credentials: true }));
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

app.use(globalLimiter);
app.use(sanitizeBody);
app.use(sanitizeQuery);
app.use(sanitizeParams);
app.use(validateContentType());

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: ".swagger-ui .topbar { display: none }",
  customSiteTitle: "StellFlow API Documentation",
}));

app.get("/api-docs.json", (_req, res) => {
  res.json(swaggerSpec);
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", apiLimiter, userRoutes);
app.use("/api/invoices", apiLimiter, invoiceRoutes);
app.use("/api/escrows", apiLimiter, escrowRoutes);
app.use("/api/payments", apiLimiter, paymentRoutes);
app.use("/api/notifications", apiLimiter, notificationRoutes);
app.use("/api/analytics", apiLimiter, analyticsRoutes);
app.use("/api/wallet", apiLimiter, walletRoutes);
app.use("/api/audit-logs", apiLimiter, auditRoutes);

app.use(errorHandler);

httpServer.listen(PORT, () => {
  console.log(`StellFlow API running on port ${PORT}`);
  console.log(`API docs available at http://localhost:${PORT}/api-docs`);
  console.log(`WebSocket server ready`);
});

export default app;
