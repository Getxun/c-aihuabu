import { nanoid } from "nanoid";

import { clearSessionCookie, createSession, hashPassword, normalizeEmail, publicUser, setSessionCookie } from "@/server/account-auth";
import { readAccountDb, writeAccountDb, type CloudUser } from "@/server/account-db";
import { fail, ok } from "@/server/api-response";

export async function POST(request: Request) {
    const body = (await request.json().catch(() => ({}))) as { email?: string; password?: string };
    const email = normalizeEmail(body.email || "");
    const password = body.password || "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("请输入有效邮箱");
    if (password.length < 8) return fail("密码至少 8 位");

    const db = await readAccountDb();
    if (db.users.some((item) => item.email === email)) return fail("邮箱已注册");

    const now = new Date().toISOString();
    const user: CloudUser = {
        id: nanoid(24),
        email,
        passwordHash: hashPassword(password),
        createdAt: now,
        updatedAt: now,
    };
    db.users.push(user);
    await writeAccountDb(db);
    await clearSessionCookie();
    await setSessionCookie(await createSession(user.id));
    return ok({ user: publicUser(user) });
}

