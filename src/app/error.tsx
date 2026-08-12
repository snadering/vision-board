"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="label-caps text-parchment-faint">Something slipped</p>
      <h1 className="mt-4 font-display text-4xl text-parchment sm:text-5xl">
        The board didn&rsquo;t load
      </h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-parchment-faint">
        It happens. Try again — the dreams are still where you left them.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 cursor-pointer rounded-full border border-ember/30 bg-ember/10 px-6 py-2.5 text-sm text-ember-soft transition-all duration-300 hover:bg-ember/20 active:scale-[0.98]"
      >
        Try again
      </button>
    </main>
  );
}
