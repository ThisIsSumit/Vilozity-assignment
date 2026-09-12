import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app, authHeader, createUser, loginAs } from "./helpers";
import { prisma } from "../src/config/prisma";
import { Role, TaskStatus } from "@prisma/client";

// These tests implement the exact "Important Security Test Cases" from the
// assessment brief (spec section 32): every case must yield 403/404, never
// a 200 with someone else's data.

describe("Security: cross-tenant authorization", () => {
  let pm1: any, pm2: any, dev1: any, dev2: any;
  let pm1Token: string, pm2Token: string, dev1Token: string, dev2Token: string;
  let client: any, project1: any, project2: any, task1: any, task2: any;

  beforeAll(async () => {
    pm1 = await createUser(Role.PROJECT_MANAGER, "pm1");
    pm2 = await createUser(Role.PROJECT_MANAGER, "pm2");
    dev1 = await createUser(Role.DEVELOPER, "dev1");
    dev2 = await createUser(Role.DEVELOPER, "dev2");

    pm1Token = await loginAs(pm1.user.email, pm1.password);
    pm2Token = await loginAs(pm2.user.email, pm2.password);
    dev1Token = await loginAs(dev1.user.email, dev1.password);
    dev2Token = await loginAs(dev2.user.email, dev2.password);

    client = await prisma.client.create({
      data: { name: "Test Co", email: "t@test.local", company: "Test Co" },
    });

    project1 = await prisma.project.create({
      data: { name: "PM1 Project", clientId: client.id, createdById: pm1.user.id },
    });
    project2 = await prisma.project.create({
      data: { name: "PM2 Project", clientId: client.id, createdById: pm2.user.id },
    });

    task1 = await prisma.task.create({
      data: { projectId: project1.id, title: "Dev1 Task", assignedDeveloperId: dev1.user.id, status: TaskStatus.TODO },
    });
    task2 = await prisma.task.create({
      data: { projectId: project2.id, title: "Dev2 Task", assignedDeveloperId: dev2.user.id, status: TaskStatus.TODO },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("Case 1: Developer cannot GET another developer's task", async () => {
    const res = await request(app).get(`/api/tasks/${task2.id}`).set(authHeader(dev1Token));
    expect([403, 404]).toContain(res.status);
  });

  it("Case 2: PM cannot GET another PM's project", async () => {
    const res = await request(app).get(`/api/projects/${project2.id}`).set(authHeader(pm1Token));
    expect([403, 404]).toContain(res.status);
  });

  it("Case 3: Developer cannot PATCH status of a task not assigned to them", async () => {
    const res = await request(app)
      .patch(`/api/tasks/${task2.id}/status`)
      .set(authHeader(dev1Token))
      .send({ status: "IN_PROGRESS" });
    expect(res.status).toBe(403);
  });

  it("Case 4: A forged JWT with an escalated role is rejected", async () => {
    // Sign a token with the WRONG secret, simulating a client trying to
    // hand-craft an admin token. Signature verification must fail.
    const forged = jwt.sign({ sub: dev1.user.id, role: "ADMIN" }, "wrong-secret-guess");
    const res = await request(app).get("/api/users").set(authHeader(forged));
    expect(res.status).toBe(401);
  });

  it("Case 5: Developer directly calling an Admin-only API is forbidden", async () => {
    const res = await request(app).get("/api/users").set(authHeader(dev1Token));
    expect(res.status).toBe(403);
  });

  it("PM cannot create a task inside another PM's project", async () => {
    const res = await request(app)
      .post("/api/tasks")
      .set(authHeader(pm1Token))
      .send({ projectId: project2.id, title: "Sneaky task", priority: "MEDIUM" });
    expect(res.status).toBe(403);
  });

  it("Project list is scoped: PM1 does not see PM2's project", async () => {
    const res = await request(app).get("/api/projects?page=1&limit=50").set(authHeader(pm1Token));
    expect(res.status).toBe(200);
    const ids = res.body.data.items.map((p: any) => p.id);
    expect(ids).toContain(project1.id);
    expect(ids).not.toContain(project2.id);
  });

  it("Task list is scoped: Developer1 does not see Developer2's task", async () => {
    const res = await request(app).get("/api/tasks?page=1&limit=50").set(authHeader(dev1Token));
    expect(res.status).toBe(200);
    const ids = res.body.data.items.map((t: any) => t.id);
    expect(ids).toContain(task1.id);
    expect(ids).not.toContain(task2.id);
  });

  it("Refresh token is never present in the JSON response body", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: pm1.user.email, password: pm1.password });
    expect(res.body.data.refreshToken).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toMatch(/refreshToken/);
  });
});
