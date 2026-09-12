import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app, createUser } from "./helpers";
import { prisma } from "../src/config/prisma";
import { Role } from "@prisma/client";

// Extracts the refresh-token cookie value from a supertest response's
// Set-Cookie header so we can simulate the browser resending it.
function extractRefreshCookie(res: request.Response): string {
  const setCookie = res.headers["set-cookie"] as unknown as string[];
  const cookie = setCookie?.find((c) => c.startsWith("refreshToken="));
  if (!cookie) throw new Error("No refreshToken cookie in response");
  return cookie.split(";")[0]; // "refreshToken=<value>"
}

describe("Security: refresh-token reuse detection", () => {
  let user: any;

  beforeAll(async () => {
    user = await createUser(Role.DEVELOPER, "refreshsec");
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("rotates the refresh token and revokes the family when a dead token is replayed", async () => {
    // 1. Login — gets refresh token R1 (family F).
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: user.user.email, password: user.password });
    expect(loginRes.status).toBe(200);
    const r1Cookie = extractRefreshCookie(loginRes);

    // 2. Normal refresh — R1 rotates to R2, same family F. R1 is now
    //    revoked in the DB but was legitimately used exactly once.
    const refreshRes = await request(app).post("/api/auth/refresh").set("Cookie", r1Cookie);
    expect(refreshRes.status).toBe(200);
    const r2Cookie = extractRefreshCookie(refreshRes);
    expect(r2Cookie).not.toBe(r1Cookie);

    // 3. R2 still works right now (family not yet flagged as compromised).
    const refreshAgainRes = await request(app).post("/api/auth/refresh").set("Cookie", r2Cookie);
    expect(refreshAgainRes.status).toBe(200);
    const r3Cookie = extractRefreshCookie(refreshAgainRes);

    // 4. REPLAY: present R1 again — it's already revoked. This must be
    //    rejected AND must revoke every other live token in the family,
    //    including the currently-valid R3.
    const replayRes = await request(app).post("/api/auth/refresh").set("Cookie", r1Cookie);
    expect(replayRes.status).toBe(401);

    // 5. R3 — which was valid a moment ago — must now ALSO be rejected,
    //    proving the whole family was torn down, not just the replayed token.
    const r3AfterReplayRes = await request(app).post("/api/auth/refresh").set("Cookie", r3Cookie);
    expect(r3AfterReplayRes.status).toBe(401);
  });
});