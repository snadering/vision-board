import Link from "next/link";
import { usableInvite } from "@/lib/invites";
import { currentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata = { title: "You're invited — Vision Board" };

/**
 * The whole of an invited friend's experience before Google: one page, one
 * button. The token stays in the URL and is handed to the sign-in route, which
 * is what remembers it across the round trip to Google.
 */
export default async function JoinPage({ params }: PageProps<"/join/[token]">) {
  const { token } = await params;

  const user = await currentUser();
  if (user) redirect(user.status === "approved" ? "/" : "/pending");

  const invite = await usableInvite(token);

  if (!invite) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-6 py-20 text-center">
        <p className="label-caps text-parchment-faint">This link has closed</p>
        <h1 className="mt-4 font-display text-4xl text-parchment sm:text-5xl">
          That invitation is no longer open
        </h1>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-parchment-faint">
          Ask whoever sent it for a fresh one — they can make a new link in a
          moment.
        </p>
        <Link
          href="/"
          className="mt-8 rounded-full border border-ember/30 bg-ember/10 px-6 py-2.5 text-sm text-ember-soft transition-all duration-300 hover:bg-ember/20"
        >
          Go to Vision Board
        </Link>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-20">
      <div className="w-full max-w-md text-center">
        <p className="label-caps text-parchment-faint">You&rsquo;re invited</p>

        <h1 className="mt-4 font-display text-5xl leading-none text-parchment sm:text-6xl">
          Vision Board
        </h1>

        <p className="mt-6 text-sm leading-relaxed text-parchment-dim">
          A dim room where a few people keep the things they are holding out for.
          Make yours.
        </p>

        <a
          href={`/api/auth/google?invite=${encodeURIComponent(invite.token)}`}
          className="glass mt-12 flex w-full items-center justify-center gap-3 rounded-full px-5 py-4 text-sm text-parchment transition-all duration-300 hover:border-ember/40 hover:bg-white/8"
        >
          <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden>
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.94v2.33A9 9 0 0 0 9 18Z" />
            <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.94a9 9 0 0 0 0 8.1l3.03-2.33Z" />
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .94 4.95l3.03 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
          </svg>
          Continue with Google
        </a>

        <p className="mt-8 text-[11px] leading-relaxed text-parchment-faint">
          You&rsquo;ll pick a name, and your board opens straight away.
        </p>
      </div>
    </main>
  );
}
