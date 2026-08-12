"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ImageDropzone } from "@/components/ImageDropzone";
import type { PreparedImage } from "@/lib/prepare-image";
import { MAX_USERNAME_LENGTH, usernameProblem, type Profile } from "@/lib/types";

export function SettingsForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [username, setUsername] = useState(profile.username);
  const [boardPublic, setBoardPublic] = useState(profile.board_public);
  const [avatar, setAvatar] = useState<PreparedImage | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const changed =
    username !== profile.username ||
    boardPublic !== profile.board_public ||
    avatar !== null;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!changed || saving) return;

    const problem = username !== profile.username ? usernameProblem(username) : null;
    if (problem) {
      setError(problem);
      return;
    }

    setSaving(true);
    setError(null);
    setSaved(false);

    const body = new FormData();
    body.set("username", username.trim().toLowerCase());
    body.set("board_public", String(boardPublic));
    if (avatar) body.set("avatar", avatar.file);

    try {
      const response = await fetch("/api/profile", { method: "PATCH", body });
      const payload = (await response.json().catch(() => null)) as
        | { profile?: Profile; error?: string }
        | null;

      if (!response.ok || !payload?.profile) {
        setError(payload?.error ?? "Could not save those changes.");
        setSaving(false);
        return;
      }

      setSaved(true);
      setAvatar(null);
      setSaving(false);
      router.refresh();
    } catch {
      setError("Could not reach the server.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-8">
      <div>
        <label htmlFor="username" className="label-caps mb-2 block text-parchment-faint">
          Username
        </label>
        <input
          id="username"
          type="text"
          value={username}
          maxLength={MAX_USERNAME_LENGTH}
          autoCapitalize="none"
          spellCheck={false}
          disabled={saving}
          onChange={(event) => {
            setUsername(event.target.value.toLowerCase());
            setSaved(false);
          }}
          className="glass w-full rounded-xl px-4 py-3 text-sm text-parchment transition-shadow duration-300 focus:shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-ember)_28%,transparent)] focus:outline-none disabled:opacity-50"
        />
        <p className="mt-2 text-[11px] text-parchment-faint">
          Changing this changes your board&rsquo;s address; old links stop working.
        </p>
      </div>

      <div>
        <span className="label-caps mb-2 block text-parchment-faint">
          Profile picture
        </span>
        <ImageDropzone
          image={avatar}
          onChange={(image) => {
            setAvatar(image);
            setSaved(false);
          }}
          disabled={saving}
          existing={
            profile.avatar_url
              ? { url: profile.avatar_url, width: 512, height: 512 }
              : null
          }
        />
      </div>

      <div>
        <span className="label-caps mb-2 block text-parchment-faint">
          Who can see your board
        </span>

        <div className="glass flex items-start gap-3 rounded-xl p-4">
          <button
            type="button"
            role="switch"
            aria-checked={boardPublic}
            aria-label="Show my board to everyone"
            disabled={saving}
            onClick={() => {
              setBoardPublic((current) => !current);
              setSaved(false);
            }}
            className={`relative mt-0.5 h-6 w-11 shrink-0 cursor-pointer rounded-full border transition-colors duration-300 disabled:opacity-50 ${
              boardPublic
                ? "border-ember/40 bg-ember/30"
                : "border-white/12 bg-white/8"
            }`}
          >
            <motion.span
              layout
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              className={`absolute top-1/2 block h-4 w-4 -translate-y-1/2 rounded-full ${
                boardPublic ? "right-1 bg-ember-soft" : "left-1 bg-parchment-faint"
              }`}
            />
          </button>

          <div className="min-w-0 text-sm">
            <p className="text-parchment">
              {boardPublic
                ? "Anyone signed in can open my board"
                : "Only I can open my board"}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-parchment-faint">
              {boardPublic
                ? "Other members can find it in the directory and look through it. The site itself is closed to anyone not signed in."
                : "Your name still appears in the directory, with a lock. Note that the photos themselves stay reachable by direct link — private hides the board, not the image files."}
            </p>
          </div>
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-xs text-blush">
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-end gap-3">
        {saved ? (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-parchment-faint"
          >
            Saved.
          </motion.span>
        ) : null}
        <button
          type="submit"
          disabled={!changed || saving}
          className="cursor-pointer rounded-full border border-ember/35 bg-ember/15 px-6 py-2.5 text-sm text-ember-soft transition-all duration-300 hover:bg-ember/25 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
