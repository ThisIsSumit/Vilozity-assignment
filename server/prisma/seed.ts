import { PrismaClient, Priority, Role, TaskStatus } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();
const DEMO_PASSWORD = "Password123!"; // documented demo-only password, never used in production

async function hash(pw: string) {
  return bcrypt.hash(pw, 12);
}

async function main() {
  console.log("Seeding database...");

  const passwordHash = await hash(DEMO_PASSWORD);

  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: { name: "Ava Admin", email: "admin@example.com", passwordHash, role: Role.ADMIN },
  });

  const pm1 = await prisma.user.upsert({
    where: { email: "pm1@example.com" },
    update: {},
    create: { name: "Priya Malhotra", email: "pm1@example.com", passwordHash, role: Role.PROJECT_MANAGER },
  });

  const pm2 = await prisma.user.upsert({
    where: { email: "pm2@example.com" },
    update: {},
    create: { name: "Paul Martinez", email: "pm2@example.com", passwordHash, role: Role.PROJECT_MANAGER },
  });

  const devs = await Promise.all(
    [
      { name: "Ravi Verma", email: "dev1@example.com" },
      { name: "Dana Chen", email: "dev2@example.com" },
      { name: "Diego Alvarez", email: "dev3@example.com" },
      { name: "Deepa Iyer", email: "dev4@example.com" },
    ].map((d) =>
      prisma.user.upsert({
        where: { email: d.email },
        update: {},
        create: { name: d.name, email: d.email, passwordHash, role: Role.DEVELOPER },
      })
    )
  );
  const [dev1, dev2, dev3, dev4] = devs;

  const clients = await Promise.all([
    prisma.client.create({ data: { name: "Nova Retail Group", email: "contact@novaretail.example", company: "Nova Retail Group" } }),
    prisma.client.create({ data: { name: "Bluefin Logistics", email: "ops@bluefin.example", company: "Bluefin Logistics" } }),
    prisma.client.create({ data: { name: "Solstice Health", email: "it@solstice.example", company: "Solstice Health" } }),
  ]);

  const project1 = await prisma.project.create({
    data: {
      name: "Nova Storefront Revamp",
      description: "Rebuild the customer-facing storefront with a headless architecture.",
      clientId: clients[0].id,
      createdById: pm1.id,
    },
  });

  const project2 = await prisma.project.create({
    data: {
      name: "Bluefin Fleet Tracker",
      description: "Real-time tracking dashboard for the logistics fleet.",
      clientId: clients[1].id,
      createdById: pm1.id,
    },
  });

  const project3 = await prisma.project.create({
    data: {
      name: "Solstice Patient Portal",
      description: "Secure patient-facing portal with appointment scheduling.",
      clientId: clients[2].id,
      createdById: pm2.id,
    },
  });

  const now = Date.now();
  const days = (n: number) => new Date(now + n * 24 * 60 * 60 * 1000);

  const taskDefs = [
    // project1 (pm1) — dev1 & dev2
    { projectId: project1.id, title: "Design product listing page", assignedDeveloperId: dev1.id, status: TaskStatus.DONE, priority: Priority.MEDIUM, dueDate: days(-10) },
    { projectId: project1.id, title: "Implement cart & checkout flow", assignedDeveloperId: dev1.id, status: TaskStatus.IN_PROGRESS, priority: Priority.HIGH, dueDate: days(5) },
    { projectId: project1.id, title: "Integrate payment gateway", assignedDeveloperId: dev2.id, status: TaskStatus.TODO, priority: Priority.CRITICAL, dueDate: days(-2) }, // overdue
    { projectId: project1.id, title: "Set up CDN + image optimization", assignedDeveloperId: dev2.id, status: TaskStatus.IN_REVIEW, priority: Priority.MEDIUM, dueDate: days(3) },
    { projectId: project1.id, title: "Write storefront E2E tests", assignedDeveloperId: dev1.id, status: TaskStatus.TODO, priority: Priority.LOW, dueDate: days(14) },

    // project2 (pm1) — dev2 & dev3
    { projectId: project2.id, title: "Build live map view", assignedDeveloperId: dev3.id, status: TaskStatus.IN_PROGRESS, priority: Priority.HIGH, dueDate: days(7) },
    { projectId: project2.id, title: "GPS ingestion pipeline", assignedDeveloperId: dev3.id, status: TaskStatus.TODO, priority: Priority.CRITICAL, dueDate: days(-1) }, // overdue
    { projectId: project2.id, title: "Fleet alerts & geofencing", assignedDeveloperId: dev2.id, status: TaskStatus.TODO, priority: Priority.MEDIUM, dueDate: days(10) },
    { projectId: project2.id, title: "Driver mobile companion app", assignedDeveloperId: dev3.id, status: TaskStatus.IN_REVIEW, priority: Priority.HIGH, dueDate: days(2) },
    { projectId: project2.id, title: "Historical route analytics", assignedDeveloperId: dev2.id, status: TaskStatus.DONE, priority: Priority.LOW, dueDate: days(-15) },

    // project3 (pm2) — dev4
    { projectId: project3.id, title: "Appointment scheduling UI", assignedDeveloperId: dev4.id, status: TaskStatus.IN_PROGRESS, priority: Priority.HIGH, dueDate: days(6) },
    { projectId: project3.id, title: "HIPAA-compliant auth hardening", assignedDeveloperId: dev4.id, status: TaskStatus.TODO, priority: Priority.CRITICAL, dueDate: days(4) },
    { projectId: project3.id, title: "Patient messaging module", assignedDeveloperId: dev4.id, status: TaskStatus.TODO, priority: Priority.MEDIUM, dueDate: days(20) },
    { projectId: project3.id, title: "Insurance verification API", assignedDeveloperId: dev4.id, status: TaskStatus.IN_REVIEW, priority: Priority.MEDIUM, dueDate: days(1) },
    { projectId: project3.id, title: "Accessibility audit", assignedDeveloperId: dev4.id, status: TaskStatus.DONE, priority: Priority.LOW, dueDate: days(-20) },
  ];

  const tasks = [];
  for (const t of taskDefs) {
    const isOverdue = t.dueDate < new Date() && t.status !== TaskStatus.DONE;
    tasks.push(await prisma.task.create({ data: { ...t, isOverdue } }));
  }

  // Pre-existing activity log entries
  for (const t of tasks.slice(0, 6)) {
    await prisma.activityLog.create({
      data: {
        projectId: t.projectId,
        taskId: t.id,
        userId: t.assignedDeveloperId!,
        action: "TASK_STATUS_CHANGED",
        oldValue: "TODO",
        newValue: t.status,
        createdAt: new Date(now - Math.random() * 5 * 24 * 60 * 60 * 1000),
      },
    });
  }

  // Pre-existing notifications
  await prisma.notification.createMany({
    data: [
      { recipientId: dev1.id, type: "TASK_ASSIGNED", title: "New task assigned", message: 'Priya assigned you "Implement cart & checkout flow"' },
      { recipientId: dev2.id, type: "TASK_ASSIGNED", title: "New task assigned", message: 'Priya assigned you "Integrate payment gateway"' },
      { recipientId: pm1.id, type: "TASK_IN_REVIEW", title: "Task moved to In Review", message: 'Dana moved "Set up CDN + image optimization" to In Review' },
      { recipientId: pm2.id, type: "TASK_IN_REVIEW", title: "Task moved to In Review", message: 'Deepa moved "Insurance verification API" to In Review' },
      { recipientId: admin.id, type: "GENERIC", title: "Welcome to Velozity", message: "Your dashboard is ready." },
    ],
  });

  console.log("Seed complete.");
  console.log("Demo login password for all accounts:", DEMO_PASSWORD);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
