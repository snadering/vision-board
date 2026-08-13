"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Lets somebody leave cleanly from a page that has no header. */
export function SignOutLink({ label = "Sign out" }: { label?: string }) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  return (
    <button
      type="button"
      disabled={leaving}
      onClick={async () => {
        setLeaving(true);
        await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
        router.replace("/");
        router.refresh();
      }}
      className="cursor-pointer rounded-full border border-white/12 px-6 py-2.5 text-sm text-parchment-dim transition-colors duration-300 hover:bg-white/8 disabled:opacity-50"
    >
      {leaving ? "Signing out…" : label}
    </button>
  );
}
