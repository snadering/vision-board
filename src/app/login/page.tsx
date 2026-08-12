import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";

const MESSAGES: Record<string, string> = {
  cancelled: "That sign-in was cancelled.",
  incomplete: "Google sent us back without an answer. Try again.",
  state: "That sign-in took too long, or came from somewhere unexpected.",
  google: "Google could not confirm who you are. Try again.",
  conflict: "An account already exists for that email address.",
  server: "Something went wrong at our end. Try again.",
};

export const metadata = { title: "Sign in — Vision Board" };

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const user = await currentUser();
  if (user) redirect(user.status === "approved" ? "/" : "/pending");

  const params = await searchParams;
  const error = typeof params.error === "string" ? MESSAGES[params.error] : null;
  const next = typeof params.next === "string" ? params.next : null;

  const href = next
    ? `/api/auth/google?next=${encodeURIComponent(next)}`
    : "/api/auth/google";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-20">
      <div className="w-full max-w-sm text-center">
        <h1 className="font-display text-5xl leading-none text-parchment">
          Vision Board
        </h1>
        <p className="mt-4 text-sm tracking-wide text-parchment-faint">
          A room full of dream boards.
        </p>

        <a
          href={href}
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

        {error ? (
          <p role="alert" className="mt-4 text-xs text-blush">
            {error}
          </p>
        ) : null}

        <p className="mt-8 text-[11px] leading-relaxed text-parchment-faint">
          New here? Signing in creates an account, and Sander lets you in.
        </p>

        <Link
          href="/"
          className="mt-6 inline-block text-xs text-parchment-faint transition-colors hover:text-parchment-dim"
        >
          Back to the boards
        </Link>
      </div>
    </main>
  );
}
