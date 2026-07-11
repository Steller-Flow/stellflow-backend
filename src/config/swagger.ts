import swaggerJsdoc from "swagger-jsdoc";
import type { Options } from "swagger-jsdoc";

const options: Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "StellFlow Backend API",
      version: "1.0.0",
      description: "StellFlow Backend API - Express 5 + Prisma + PostgreSQL with Stellar blockchain integration",
      contact: {
        name: "StellFlow Team",
      },
    },
    servers: [
      {
        url: "http://localhost:3001",
        description: "Development server",
      },
      {
        url: "https://api.stellflow.io",
        description: "Production server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter your JWT access token",
        },
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "refreshToken",
          description: "Refresh token stored in HTTP-only cookie",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "string", description: "User ID (cuid)" },
            fullname: { type: "string", description: "Full name" },
            email: { type: "string", format: "email", description: "Email address" },
            role: { type: "string", enum: ["FREELANCER", "CLIENT", "ADMIN"], description: "User role" },
            walletAddress: { type: "string", nullable: true, description: "Stellar wallet address" },
            profileImage: { type: "string", nullable: true, description: "Profile image URL" },
            country: { type: "string", nullable: true, description: "Country" },
            isVerified: { type: "boolean", description: "Email verification status" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Invoice: {
          type: "object",
          properties: {
            id: { type: "string" },
            creatorId: { type: "string" },
            recipientId: { type: "string" },
            title: { type: "string" },
            description: { type: "string" },
            amount: { type: "number" },
            currency: { type: "string", default: "USDC" },
            status: { type: "string", enum: ["DRAFT", "PENDING", "FUNDED", "IN_ESCROW", "COMPLETED", "CANCELLED", "DISPUTED"] },
            dueDate: { type: "string", format: "date-time", nullable: true },
            paidAt: { type: "string", format: "date-time", nullable: true },
            txHash: { type: "string", nullable: true },
            contractId: { type: "string", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Escrow: {
          type: "object",
          properties: {
            id: { type: "string" },
            invoiceId: { type: "string" },
            clientId: { type: "string" },
            freelancerId: { type: "string" },
            contractId: { type: "string" },
            txHash: { type: "string", nullable: true },
            amount: { type: "number" },
            currency: { type: "string", default: "USDC" },
            status: { type: "string", enum: ["PENDING", "FUNDED", "RELEASED", "REFUNDED", "DISPUTED"] },
            fundedAt: { type: "string", format: "date-time", nullable: true },
            releasedAt: { type: "string", format: "date-time", nullable: true },
            refundedAt: { type: "string", format: "date-time", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            error: { type: "string" },
          },
        },
        SuccessResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { type: "object" },
          },
        },
        PaginationMeta: {
          type: "object",
          properties: {
            page: { type: "integer" },
            limit: { type: "integer" },
            total: { type: "integer" },
            totalPages: { type: "integer" },
          },
        },
        RegisterRequest: {
          type: "object",
          required: ["fullname", "email", "password", "role"],
          properties: {
            fullname: { type: "string", minLength: 2, description: "Full name" },
            email: { type: "string", format: "email", description: "Email address" },
            password: { type: "string", minLength: 8, description: "Password (min 8 characters)" },
            role: { type: "string", enum: ["FREELANCER", "CLIENT"], description: "User role" },
            walletAddress: { type: "string", description: "Stellar wallet address (optional)" },
            country: { type: "string", description: "Country (optional)" },
          },
        },
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 1 },
          },
        },
        AuthResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              properties: {
                user: { $ref: "#/components/schemas/User" },
                accessToken: { type: "string", description: "JWT access token" },
                refreshToken: { type: "string", description: "JWT refresh token" },
              },
            },
          },
        },
        CreateInvoiceRequest: {
          type: "object",
          required: ["recipientId", "title", "description", "amount"],
          properties: {
            recipientId: { type: "string", description: "Recipient user ID" },
            title: { type: "string", description: "Invoice title" },
            description: { type: "string", description: "Invoice description" },
            amount: { type: "number", exclusiveMinimum: 0, description: "Amount" },
            currency: { type: "string", default: "USDC", description: "Currency code" },
            dueDate: { type: "string", format: "date-time", description: "Due date (ISO 8601)" },
          },
        },
        CreateEscrowRequest: {
          type: "object",
          required: ["invoiceId", "contractId"],
          properties: {
            invoiceId: { type: "string", description: "Invoice ID" },
            contractId: { type: "string", description: "Stellar contract ID" },
          },
        },
        FundEscrowRequest: {
          type: "object",
          required: ["txHash"],
          properties: {
            txHash: { type: "string", description: "Stellar transaction hash" },
          },
        },
      },
    },
  },
  apis: ["./src/routes/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
