import { clearSessionCookie, deleteSession } from "@/server/account-auth";
import { ok } from "@/server/api-response";

export async function POST() {
    await deleteSession();
    await clearSessionCookie();
    return ok({ success: true });
}

