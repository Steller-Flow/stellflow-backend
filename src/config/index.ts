import "dotenv/config";

export const config = {
  port: parseInt(process.env["PORT"] ?? "3001", 10),
  nodeEnv: process.env["NODE_ENV"] ?? "development",
  jwt: {
    secret: process.env["JWT_SECRET"] ?? "",
    expiresIn: 900,
    refreshSecret: process.env["JWT_REFRESH_SECRET"] ?? "",
    refreshExpiresIn: 604800,
  },
  stellar: {
    network: process.env["STELLAR_NETWORK"] ?? "testnet",
    horizonUrl: process.env["STELLAR_HORIZON_URL"] ?? "https://horizon-testnet.stellar.org",
  },
  cors: {
    origin: process.env["CORS_ORIGIN"] ?? "http://localhost:3000",
  },
} as const;
