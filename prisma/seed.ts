import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const USERS = [
  {
    fullname: "Alice Johnson",
    email: "alice@stellflow.com",
    role: UserRole.FREELANCER,
    walletAddress: "GALAXYAAAAAAABBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
    country: "Nigeria",
    isVerified: true,
  },
  {
    fullname: "Bob Smith",
    email: "bob@stellflow.com",
    role: UserRole.CLIENT,
    walletAddress: "GALAXYCCCCCCCCDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD",
    country: "United States",
    isVerified: true,
  },
  {
    fullname: "Carol Williams",
    email: "carol@stellflow.com",
    role: UserRole.FREELANCER,
    walletAddress: "GALAXYEEEEEEEEFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF",
    country: "Kenya",
    isVerified: true,
  },
  {
    fullname: "David Brown",
    email: "david@stellflow.com",
    role: UserRole.CLIENT,
    walletAddress: "GALAXYGGGGGGGGGHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH",
    country: "United Kingdom",
    isVerified: false,
  },
  {
    fullname: "Admin User",
    email: "admin@stellflow.com",
    role: UserRole.ADMIN,
    walletAddress: "GALAXYIIIIIIIIIIJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJ",
    country: "Nigeria",
    isVerified: true,
  },
];

const INVOICES = [
  {
    title: "Web Development - Landing Page",
    description: "Design and development of a responsive landing page with hero section, features, and contact form",
    amount: 500,
    status: "PENDING",
  },
  {
    title: "Smart Contract Audit Review",
    description: "Security review of Soroban escrow smart contract including edge case analysis",
    amount: 1200,
    status: "DRAFT",
  },
  {
    title: "UI/UX Design for Dashboard",
    description: "Complete dashboard design with wireframes, mockups, and Figma prototype",
    amount: 800,
    status: "FUNDED",
  },
  {
    title: "Backend API Development",
    description: "REST API for invoice management, user authentication, and payment processing",
    amount: 2000,
    status: "COMPLETED",
  },
  {
    title: "Mobile App Wireframes",
    description: "Wireframes for iOS and Android mobile application",
    amount: 350,
    status: "CANCELLED",
  },
];

const ESCROWS = [
  {
    contractId: "ESC-CONTRACT-001",
    amount: 800,
    status: "FUNDED",
  },
  {
    contractId: "ESC-CONTRACT-002",
    amount: 2000,
    status: "RELEASED",
  },
];

const NOTIFICATIONS = [
  {
    title: "Invoice Sent",
    message: "You have sent an invoice to Bob Smith",
    type: "INVOICE" as const,
  },
  {
    title: "Payment Received",
    message: "You received a payment of 500 USDC",
    type: "PAYMENT" as const,
  },
  {
    title: "Escrow Funded",
    message: "Your escrow has been funded with 800 USDC",
    type: "ESCROW" as const,
  },
];

async function main() {
  console.log("Seeding database...");

  await prisma.notification.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.escrow.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.user.deleteMany();

  const password = await bcrypt.hash("password123", 10);

  const users = await Promise.all(
    USERS.map((user) =>
      prisma.user.create({
        data: { ...user, password },
      })
    )
  );

  console.log(`Created ${users.length} users`);

  const alice = users[0]!;
  const bob = users[1]!;
  const carol = users[2]!;
  const david = users[3]!;

  const invoices = await Promise.all([
    prisma.invoice.create({
      data: {
        creatorId: alice.id,
        recipientId: bob.id,
        ...INVOICES[0]!,
        lineItems: [
          { description: "Landing page design", quantity: 1, unitPrice: 200 },
          { description: "Frontend development", quantity: 1, unitPrice: 250 },
          { description: "Responsive testing", quantity: 5, unitPrice: 10 },
        ],
      },
    }),
    prisma.invoice.create({
      data: {
        creatorId: carol.id,
        recipientId: david.id,
        ...INVOICES[1]!,
        lineItems: [
          { description: "Smart contract review", quantity: 1, unitPrice: 800 },
          { description: "Edge case analysis", quantity: 1, unitPrice: 400 },
        ],
      },
    }),
    prisma.invoice.create({
      data: {
        creatorId: carol.id,
        recipientId: bob.id,
        ...INVOICES[2]!,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        lineItems: [
          { description: "Wireframes", quantity: 8, unitPrice: 50 },
          { description: "High-fidelity mockups", quantity: 4, unitPrice: 100 },
        ],
      },
    }),
    prisma.invoice.create({
      data: {
        creatorId: alice.id,
        recipientId: david.id,
        ...INVOICES[3]!,
        paidAt: new Date(),
        txHash: "TXN_HASH_EXAMPLE_001",
      },
    }),
    prisma.invoice.create({
      data: {
        creatorId: carol.id,
        recipientId: bob.id,
        ...INVOICES[4]!,
      },
    }),
  ]);

  console.log(`Created ${invoices.length} invoices`);

  const fundedInvoice = invoices[2]!;
  const completedInvoice = invoices[3]!;

  const escrows = await Promise.all([
    prisma.escrow.create({
      data: {
        invoiceId: fundedInvoice.id,
        clientId: bob.id,
        freelancerId: carol.id,
        contractId: ESCROWS[0]!.contractId,
        amount: ESCROWS[0]!.amount,
        status: ESCROWS[0]!.status,
        fundedAt: new Date(),
      },
    }),
    prisma.escrow.create({
      data: {
        invoiceId: completedInvoice.id,
        clientId: david.id,
        freelancerId: alice.id,
        contractId: ESCROWS[1]!.contractId,
        amount: ESCROWS[1]!.amount,
        status: ESCROWS[1]!.status,
        fundedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        releasedAt: new Date(),
      },
    }),
  ]);

  console.log(`Created ${escrows.length} escrows`);

  const notifications = await Promise.all(
    NOTIFICATIONS.map((notif, i) =>
      prisma.notification.create({
        data: {
          userId: i < 2 ? alice.id : carol.id,
          ...notif,
        },
      })
    )
  );

  console.log(`Created ${notifications.length} notifications`);

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
