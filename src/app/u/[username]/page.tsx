import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getProfileByUsername } from "@/lib/profiles";
import { listVisionsFor } from "@/lib/visions";
import { SiteHeader } from "@/components/SiteHeader";
import { BoardApp } from "@/components/BoardApp";

export async function generateMetadata({ params }: PageProps<"/u/[username]">) {
  const { username } = await params;
  return { title: `${username} — Vision Board` };
}

export default async function BoardPage({ params }: PageProps<"/u/[username]">) {
  const { username } = await params;

  const viewer = await currentUser();
  // Boards are not readable from outside at all, so this never reaches the
  // database for a visitor who is not signed in.
  if (!viewer) redirect(`/login?next=/u/${encodeURIComponent(username)}`);

  const profile = await getProfileByUsername(username);

  // A blocked or still-pending account has no public board.
  if (!profile || profile.status !== "approved") notFound();

  const isOwner = viewer?.id === profile.id;

  // The visibility check that matters. Nothing is fetched for a board the
  // viewer may not see, so no vision ever reaches the page in the first place.
  if (!profile.board_public && !isOwner) {
    return (
      <>
        <SiteHeader user={viewer} />
        <main className="flex grow flex-col items-center justify-center px-6 py-24 text-center">
          <svg
            width="34"
            height="34"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.9"
            aria-hidden
            className="mb-6 text-parchment-faint"
          >
            <rect x="3" y="7" width="10" height="7" rx="2" />
            <path d="M5.5 7V5a2.5 2.5 0 1 1 5 0v2" strokeLinecap="round" />
          </svg>
          <h1 className="font-display text-4xl text-parchment sm:text-5xl">
            {profile.username} keeps this one private
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-parchment-faint">
            Some dreams aren&rsquo;t for the room. There are other boards to see.
          </p>
          <Link
            href="/"
            className="mt-8 rounded-full border border-ember/30 bg-ember/10 px-6 py-2.5 text-sm text-ember-soft transition-all duration-300 hover:bg-ember/20"
          >
            Back to everyone
          </Link>
        </main>
      </>
    );
  }

  const visions = await listVisionsFor(profile.id);

  return (
    <>
      <SiteHeader user={viewer} />
      <main className="mx-auto w-full max-w-7xl grow px-4 pt-2 pb-24 sm:px-8">
        <BoardApp
          owner={{ id: profile.id, username: profile.username }}
          initialVisions={visions}
          canEdit={isOwner}
        />
      </main>
    </>
  );
}
