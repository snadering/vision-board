import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  INVITE_COOKIE,
  SIGNUP_COOKIE,
  verify,
  type InvitePayload,
  type SignupPayload,
} from "@/lib/session";
import { usableInvite } from "@/lib/invites";
import { currentUser } from "@/lib/auth";
import { ClaimUsername } from "@/components/ClaimUsername";

export const metadata = { title: "Choose a name — Vision Board" };

/** The one thing Google cannot tell us: what you want to be called here. */
export default async function WelcomePage() {
  const existing = await currentUser();
  if (existing) redirect(existing.status === "approved" ? "/" : "/pending");

  const store = await cookies();
  const signup = await verify<SignupPayload>(store.get(SIGNUP_COOKIE)?.value);
  if (!signup) redirect("/login");

  const suggestion = (signup.name ?? signup.email.split("@")[0] ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "")
    .slice(0, 24);

  const claimed = await verify<InvitePayload>(store.get(INVITE_COOKIE)?.value);
  const invited = claimed ? (await usableInvite(claimed.token)) !== null : false;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-20">
      <ClaimUsername
        email={signup.email}
        suggestion={suggestion}
        invited={invited}
      />
    </main>
  );
}
