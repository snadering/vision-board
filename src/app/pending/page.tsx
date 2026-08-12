import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata = { title: "Almost in — Vision Board" };

export default async function PendingPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.status === "approved") redirect(`/u/${user.username}`);

  return (
    <>
      <SiteHeader user={user} />
      <main className="flex grow flex-col items-center justify-center px-6 py-24 text-center">
        <p className="label-caps text-parchment-faint">Hold on a moment</p>
        <h1 className="mt-4 font-display text-4xl text-parchment sm:text-5xl">
          Your board is being made ready
        </h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-parchment-faint">
          You&rsquo;re signed in as <span className="text-parchment-dim">{user.username}</span>.
          Sander has to wave you through before your board opens — you&rsquo;ll be
          in as soon as he does.
        </p>
        <Link
          href="/"
          className="mt-8 rounded-full border border-ember/30 bg-ember/10 px-6 py-2.5 text-sm text-ember-soft transition-all duration-300 hover:bg-ember/20"
        >
          Look around meanwhile
        </Link>
      </main>
    </>
  );
}
