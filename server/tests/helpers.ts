import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/config/prisma";
import { hashPassword } from "../src/utils/password";
import { Role } from "@prisma/client";

export const app = createApp();

export async function createUser(role: Role, emailPrefix: string) {
  const email = `${emailPrefix}.${Date.now()}.${Math.random().toString(36).slice(2)}@test.local`;
  const passwordHash = await hashPassword("TestPass123!");
  const user = await prisma.user.create({
    data: { name: emailPrefix, email, passwordHash, role },
  });
  return { user, password: "TestPass123!" };
}

export async function loginAs(email: string, password: string) {
  const res = await request(app).post("/api/auth/login").send({ email, password });
  return res.body.data.accessToken as string;
}

export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}
