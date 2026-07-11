export const mockUser = {
  id: "clx1234567890",
  fullname: "John Doe",
  email: "john@example.com",
  password: "$2a$12$hashedpassword",
  walletAddress: "GCKFBEIYVYQV6FYNUWZV6MO7VVI7RMUO6ESLO45S73JQ27LHJKR2",
  profileImage: null,
  country: "US",
  role: "FREELANCER" as const,
  isVerified: true,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

export const mockClient = {
  ...mockUser,
  id: "clx1234567891",
  fullname: "Jane Smith",
  email: "jane@example.com",
  role: "CLIENT" as const,
};

export const mockAdmin = {
  ...mockUser,
  id: "clx1234567892",
  fullname: "Admin User",
  email: "admin@example.com",
  role: "ADMIN" as const,
};

export const mockInvoice = {
  id: "clx_inv_001",
  creatorId: "clx1234567890",
  recipientId: "clx1234567891",
  title: "Web Development Services",
  description: "Frontend development for e-commerce site",
  amount: 1500,
  currency: "USDC",
  status: "DRAFT" as const,
  dueDate: new Date("2024-02-01"),
  paidAt: null,
  txHash: null,
  contractId: null,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  creator: { id: "clx1234567890", fullname: "John Doe", email: "john@example.com" },
  recipient: { id: "clx1234567891", fullname: "Jane Smith", email: "jane@example.com" },
  escrow: null,
};

export const mockEscrow = {
  id: "clx_esc_001",
  invoiceId: "clx_inv_001",
  clientId: "clx1234567891",
  freelancerId: "clx1234567890",
  contractId: "contract_mock_123",
  txHash: null,
  amount: 1500,
  currency: "USDC",
  status: "PENDING" as const,
  fundedAt: null,
  releasedAt: null,
  refundedAt: null,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  invoice: { id: "clx_inv_001", title: "Web Development Services", amount: 1500, status: "IN_ESCROW" as const },
  client: { id: "clx1234567891", fullname: "Jane Smith", email: "jane@example.com" },
  freelancer: { id: "clx1234567890", fullname: "John Doe", email: "john@example.com" },
  payments: [],
};

export const mockPayment = {
  id: "clx_pay_001",
  userId: "clx1234567891",
  escrowId: "clx_esc_001",
  amount: 1500,
  currency: "USDC",
  txHash: "tx_mock_fund",
  status: "SUCCESS" as const,
  description: "Funded escrow for invoice",
  createdAt: new Date("2024-01-01"),
};

export const mockTokens = {
  accessToken: "eyJhbGciOiJIUzI1NiJ9.mock.access.token",
  refreshToken: "eyJhbGciOiJIUzI1NiJ9.mock.refresh.token",
};
