import { cookies } from "next/headers";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { nanoid } from "nanoid";

import { readAccountDb, writeAccountDb, type CloudSession, type CloudUser } from "./account-db";

export const SESSION_COOKIE = "ai_huabu_session";
const SESSION_DAYS = 30;

export function normalizeEmail(email: string) {
    return email.trim().toLowerCase();
}

export function hashPassword(password: string) {
    const salt = randomBytes(16).toString("base64url");
    const hash = scryptSync(password, salt, 64).toString("base64url");
    return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
    const [, salt, hash] = stored.split(":");
    if (!salt || !hash) return false;
    const actual = Buffer.from(scryptSync(password, salt, 64).toString("base64url"));
    const expected = Buffer.from(hash);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function createSession(userId: string) {
    const now = new Date();
    const session: CloudSession = {
        id: nanoid(32),
        userId,
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString(),
    };
    const db = await readAccountDb();
    db.sessions = db.sessions.filter((item) => new Date(item.expiresAt).getTime() > Date.now());
    db.sessions.push(session);
    await writeAccountDb(db);
    return session;
}

export async function setSessionCookie(session: CloudSession) {
    (await cookies()).set(SESSION_COOKIE, session.id, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        expires: new Date(session.expiresAt),
    });
}

export async function clearSessionCookie() {
    (await cookies()).set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
}

export async function currentUser(): Promise<CloudUser | null> {
    const sessionId = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!sessionId) return null;
    const db = await readAccountDb();
    const session = db.sessions.find((item) => item.id === sessionId && new Date(item.expiresAt).getTime() > Date.now());
    if (!session) return null;
    return db.users.find((item) => item.id === session.userId) || null;
}

export async function deleteSession() {
    const sessionId = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!sessionId) return;
    const db = await readAccountDb();
    db.sessions = db.sessions.filter((item) => item.id !== sessionId);
    await writeAccountDb(db);
}

export function publicUser(user: CloudUser) {
    return { id: user.id, email: user.email, createdAt: user.createdAt };
}

export function stableUserId(email: string) {
    return createHash("sha256").update(normalizeEmail(email)).digest("base64url").slice(0, 24);
}

