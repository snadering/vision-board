import { redirect } from "next/navigation";
import { sessionProfile } from "@/lib/auth";
import { SignOutLink } from "@/components/SignOutLink";

export const metadata = { title: "Access removed — Vision Board" };

/**
 * What a removed account sees instead of an unexplained loop between the
 * sign-in page and Google. Says plainly what has happened, and offers the one
 * thing left to do.
 */
export default async function BlockedPage() {
  const user = await sessionProfile();
  if (!user) redirect("/login");
  if (user.status !== "blocked") {
    redirect(user.status === "approved" ? `/u/${user.username}` : "/pending");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-20 text-center">
      <p className="label-caps text-parchment-faint">Signed in as {user.username}</p>

      <h1 className="mt-4 font-display text-4xl text-parchment sm:text-5xl">
        Your access has been removed
      </h1>

      <p className="mt-4 max-w-sm text-sm leading-relaxed text-parchment-faint">
        This board is no longer open to your account. Nothing you pinned up has
        been deleted — if you think this is a mistake, ask whoever invited you.
      </p>

      <div className="mt-8">
        <SignOutLink />
      </div>
    </main>
  );
}
