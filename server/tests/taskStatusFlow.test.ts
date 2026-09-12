import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app, authHeader, createUser, loginAs } from "./helpers";
import { prisma } from "../src/config/prisma";
import { Role, TaskStatus } from "@prisma/client";

describe("Task status change: activity + notification side effects", () => {
  let pm: any, dev: any, pmToken: string, devToken: string;
  let project: any, task: any;

  beforeAll(async () => {
    pm = await createUser(Role.PROJECT_MANAGER, "pmflow");
    dev = await createUser(Role.DEVELOPER, "devflow");
    pmToken = await loginAs(pm.user.email, pm.password);
    devToken = await loginAs(dev.user.email, dev.password);

    const client = await prisma.client.create({
      data: { name: "Flow Co", email: "flow@test.local", company: "Flow Co" },
    });
    project = await prisma.project.create({
      data: { name: "Flow Project", clientId: client.id, createdById: pm.user.id },
    });
    task = await prisma.task.create({
      data: {
        projectId: project.id,
        title: "Flow Task",
        assignedDeveloperId: dev.user.id,
        status: TaskStatus.IN_PROGRESS,
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("persists an ActivityLog row and notifies the owning PM when moved to IN_REVIEW", async () => {
    const res = await request(app)
      .patch(`/api/tasks/${task.id}/status`)
      .set(authHeader(devToken))
      .send({ status: "IN_REVIEW" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("IN_REVIEW");

    const activity = await prisma.activityLog.findFirst({
      where: { taskId: task.id, newValue: "IN_REVIEW" },
    });
    expect(activity).not.toBeNull();
    expect(activity?.oldValue).toBe("IN_PROGRESS");

    const notification = await prisma.notification.findFirst({
      where: { recipientId: pm.user.id, type: "TASK_IN_REVIEW" },
    });
    expect(notification).not.toBeNull();
  });

  it("GET /api/activity/recent is scoped to the PM's own projects", async () => {
    const res = await request(app).get("/api/activity/recent?limit=20").set(authHeader(pmToken));
    expect(res.status).toBe(200);
    expect(res.body.data.every((a: any) => a.projectId === project.id)).toBe(true);
  });
});
