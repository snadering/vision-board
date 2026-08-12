"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { MAX_USERNAME_LENGTH, usernameProblem } from "@/lib/types";

export function ClaimUsername({
  email,
  suggestion,
}: {
  email: string;
  suggestion: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [username, setUsername] = useState(suggestion);
  const [error, setError] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;

    // Say what's wrong before making the round trip.
    const problem = usernameProblem(username);
    if (problem) {
      setError(problem);
      setShaking(true);
      return;
    }

    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim().toLowerCase() }),
      });

      if (response.ok) {
        router.replace("/pending");
        router.refresh();
        return;
      }

      const body = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(body?.error ?? "Could not take that name.");
      setShaking(true);
      setPending(false);
    } catch {
      setError("Could not reach the server.");
      setShaking(true);
      setPending(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-sm"
    >
      <div className="mb-10 text-center">
        <p className="label-caps text-parchment-faint">Almost there</p>
        <h1 className="mt-3 font-display text-4xl leading-none text-parchment">
          What should we call you?
        </h1>
        <p className="mt-4 text-xs leading-relaxed text-parchment-faint">
          This is how everyone will find your board. Signed in as {email}.
        </p>
      </div>

      <form onSubmit={onSubmit} noValidate>
        <label htmlFor="username" className="sr-only">
          Username
        </label>

        <div
          className={shaking ? "shake" : undefined}
          onAnimationEnd={() => setShaking(false)}
        >
          <input
            ref={inputRef}
            id="username"
            name="username"
            type="text"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={MAX_USERNAME_LENGTH}
            value={username}
            disabled={pending}
            placeholder="yourname"
            onChange={(event) => {
              setUsername(event.target.value.toLowerCase());
              if (error) setError(null);
            }}
            className="glass w-full rounded-[var(--radius-glass)] px-5 py-4 text-center text-sm text-parchment placeholder:text-parchment-faint/60 transition-all duration-500 focus:border-ember/40 focus:shadow-[0_0_60px_-12px_color-mix(in_oklab,var(--color-ember)_45%,transparent)] focus:outline-none disabled:opacity-60"
          />
        </div>

        <div className="min-h-6">
          {error ? (
            <motion.p
              role="alert"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-3 text-center text-xs text-blush"
            >
              {error}
            </motion.p>
          ) : null}
        </div>

        <motion.button
          type="submit"
          disabled={pending || username.length === 0}
          whileTap={{ scale: 0.98 }}
          className="mt-4 w-full cursor-pointer rounded-full border border-ember/25 bg-ember/10 px-5 py-3 text-sm text-ember-soft transition-colors duration-300 hover:bg-ember/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? "Claiming…" : "Claim it"}
        </motion.button>
      </form>
    </motion.div>
  );
}
