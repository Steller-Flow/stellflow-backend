import "dotenv/config";

export const config = {
  port: parseInt(process.env["PORT"] ?? "3001", 10),
  nodeEnv: process.env["NODE_ENV"] ?? "development",
  jwt: {
    secret: process.env["JWT_SECRET"] ?? "",
    expiresIn: process.env["JWT_EXPIRES_IN"] ?? "7d",
  },
  stellar: {
    network: process.env["STELLAR_NETWORK"] ?? "testnet",
    horizonUrl: process.env["STELLAR_HORIZON_URL"] ?? "https://horizon-testnet.stellar.org",
  },
  cors: {
    origin: process.env["CORS_ORIGIN"] ?? "http://localhost:3000",
  },
  s3: {
    region: process.env["AWS_REGION"] ?? "us-east-1",
    bucket: process.env["AWS_S3_BUCKET"] ?? "stellflow-uploads",
    accessKeyId: process.env["AWS_ACCESS_KEY_ID"] ?? "",
    secretAccessKey: process.env["AWS_SECRET_ACCESS_KEY"] ?? "",
    endpoint: process.env["AWS_S3_ENDPOINT"] ?? undefined,
    forcePathStyle: process.env["AWS_S3_FORCE_PATH_STYLE"] === "true",
  },
} as const;
