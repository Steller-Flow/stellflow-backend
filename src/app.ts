import express from "express";
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

// The Express application without a listening server, so tests can mount it
// on an ephemeral port and exercise the real middleware chain and routing.
// src/index.ts wraps this in an http.Server, attaches socket.io, and listens.
const app = express();

app.use(helmet());
app.use(cors({ origin: process.env["CORS_ORIGIN"] ?? "http://localhost:3000", credentials: true }));
if (process.env["NODE_ENV"] !== "test") {
  app.use(morgan("dev"));
}
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

export default app;
