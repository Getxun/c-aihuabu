import { createSession, normalizeEmail, publicUser, setSessionCookie, verifyPassword } from "@/server/account-auth";
import { readAccountDb } from "@/server/account-db";
import { fail, ok } from "@/server/api-response";

export async function POST(request: Request) {
    const body = (await request.json().catch(() => ({}))) as { email?: string; password?: string };
    const email = normalizeEmail(body.email || "");
    const user = (await readAccountDb()).users.find((item) => item.email === email);
    if (!user || !verifyPassword(body.password || "", user.passwordHash)) return fail("邮箱或密码错误", 401);
    await setSessionCookie(await createSession(user.id));
    return ok({ user: publicUser(user) });
}

