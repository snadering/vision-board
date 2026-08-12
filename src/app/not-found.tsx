import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="label-caps text-parchment-faint">Nothing pinned here</p>
      <h1 className="mt-4 font-display text-4xl text-parchment sm:text-5xl">
        This page isn&rsquo;t on the board
      </h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-parchment-faint">
        Whatever you were looking for, it isn&rsquo;t at this address.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-full border border-ember/30 bg-ember/10 px-6 py-2.5 text-sm text-ember-soft transition-all duration-300 hover:bg-ember/20"
      >
        Back to the board
      </Link>
    </main>
  );
}
