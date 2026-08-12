import Link from "next/link";

/**
 * The front door for anyone not signed in. Deliberately says nothing about who
 * is inside — no names, no counts, no boards — because the point of gating the
 * directory is that the membership is not public either.
 */
export function SignedOutLanding() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-20">
      <div className="w-full max-w-md text-center">
        <h1 className="font-display text-5xl leading-none text-parchment sm:text-6xl">
          Vision Board
        </h1>

        <p className="mt-6 text-sm leading-relaxed text-parchment-dim">
          A dim room where a few people keep the things they are holding out for.
        </p>

        <Link
          href="/login"
          className="glass mt-12 inline-flex items-center justify-center rounded-full px-8 py-3.5 text-sm text-parchment transition-all duration-300 hover:border-ember/40 hover:bg-white/8"
        >
          Sign in
        </Link>

        <p className="mt-8 text-[11px] leading-relaxed text-parchment-faint">
          By invitation. New accounts are let in by hand.
        </p>
      </div>
    </main>
  );
}
