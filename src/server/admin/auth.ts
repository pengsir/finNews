import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { hashPassword, verifyPassword } from "@/server/admin/password";

const ADMIN_SESSION_COOKIE = "fin_news_admin_session";

function getAdminSecret() {
  return process.env.ADMIN_SESSION_SECRET || "dev-admin-session-secret";
}

function getSeedAdminUsername() {
  return process.env.ADMIN_USERNAME || "admin";
}

function getSeedAdminPassword() {
  return process.env.ADMIN_PASSWORD || "finnews-admin";
}

function createSignature(payload: string) {
  return createHmac("sha256", getAdminSecret()).update(payload).digest("base64url");
}

function createSessionToken(username: string) {
  const payload = Buffer.from(
    JSON.stringify({
      username,
      issuedAt: Date.now()
    })
  ).toString("base64url");

  return `${payload}.${createSignature(payload)}`;
}

function verifySessionToken(token: string) {
  const [payload, signature] = token.split(".");

  if (!payload || !signature) {
    return false;
  }

  const expected = createSignature(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  try {
    if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
      return false;
    }

    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      username?: string;
    };

    return typeof session.username === "string" && session.username.length > 0;
  } catch {
    return false;
  }
}

async function ensureAdminUser() {
  const existing = await prisma.adminUser.findFirst();

  if (existing) {
    return existing;
  }

  return prisma.adminUser.create({
    data: {
      username: getSeedAdminUsername(),
      passwordHash: hashPassword(getSeedAdminPassword())
    }
  });
}

export async function isAdminAuthenticated() {
  await ensureAdminUser();
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  return token ? verifySessionToken(token) : false;
}

export async function requireAdminAuth() {
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    redirect("/admin/login" as never);
  }
}

export async function createAdminSession(username: string) {
  await ensureAdminUser();
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, createSessionToken(username), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

export async function validateAdminCredentials(username: string, password: string) {
  const adminUser = await ensureAdminUser();

  if (username !== adminUser.username) {
    return false;
  }

  return verifyPassword(password, adminUser.passwordHash);
}

export async function updateAdminPassword(currentPassword: string, nextPassword: string) {
  const adminUser = await ensureAdminUser();

  if (!verifyPassword(currentPassword, adminUser.passwordHash)) {
    throw new Error("Current password is incorrect.");
  }

  await prisma.adminUser.update({
    where: {
      id: adminUser.id
    },
    data: {
      passwordHash: hashPassword(nextPassword)
    }
  });
}

export async function getAdminUsername() {
  const adminUser = await ensureAdminUser();
  return adminUser.username;
}
