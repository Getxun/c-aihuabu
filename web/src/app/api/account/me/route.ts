import { currentUser, publicUser } from "@/server/account-auth";
import { ok } from "@/server/api-response";

export async function GET() {
    const user = await currentUser();
    return ok({ user: user ? publicUser(user) : null });
}

