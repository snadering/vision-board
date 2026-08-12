"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";

export function LoginForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (pending || password.length === 0) return;

    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        // A full refresh so the server re-renders with the new cookie in hand.
        router.replace("/");
        router.refresh();
        return;
      }

      const body = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(body?.error ?? "Something went wrong.");
      setShaking(true);
      setPassword("");
      inputRef.current?.focus();
    } catch {
      setError("Could not reach the door. Check your connection.");
      setShaking(true);
    } finally {
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
      <div className="mb-12 text-center">
        <h1 className="font-display text-5xl leading-none text-parchment">
          Vision Board
        </h1>
        <p className="mt-4 text-sm tracking-wide text-parchment-faint">
          Two people, one dream board.
        </p>
      </div>

      <form onSubmit={onSubmit} noValidate>
        <label htmlFor="password" className="sr-only">
          Password
        </label>

        <div
          className={shaking ? "shake" : undefined}
          onAnimationEnd={() => setShaking(false)}
        >
          <input
            ref={inputRef}
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            disabled={pending}
            onChange={(event) => {
              setPassword(event.target.value);
              if (error) setError(null);
            }}
            placeholder="Password"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "password-error" : undefined}
            className="glass w-full rounded-[var(--radius-glass)] px-5 py-4 text-center text-base text-parchment placeholder:text-parchment-faint/70 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)] transition-all duration-500 focus:border-ember/40 focus:shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-ember)_30%,transparent),0_0_60px_-12px_color-mix(in_oklab,var(--color-ember)_45%,transparent)] focus:outline-none disabled:opacity-60"
          />
        </div>

        <div className="h-6">
          {error ? (
            <motion.p
              id="password-error"
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
          disabled={pending || password.length === 0}
          whileTap={{ scale: 0.98 }}
          className="mt-4 w-full rounded-full border border-ember/25 bg-ember/10 px-5 py-3 text-sm text-ember-soft transition-colors duration-300 hover:bg-ember/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? "Opening…" : "Enter"}
        </motion.button>
      </form>
    </motion.div>
  );
}
