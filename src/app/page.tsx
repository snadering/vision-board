import { currentUser } from "@/lib/auth";
import { listDirectory, listByStatus } from "@/lib/profiles";
import { SiteHeader } from "@/components/SiteHeader";
import { Directory } from "@/components/Directory";
import { SignedOutLanding } from "@/components/SignedOutLanding";

export const metadata = {
  title: "Vision Board",
  description: "Everybody's dream boards, in one dim room.",
};

/** Everyone, scattered — but only once you are inside. */
export default async function DirectoryPage() {
  const user = await currentUser();

  // Who is here is not public information, so a visitor gets a front door.
  if (!user) return <SignedOutLanding />;

  const [people, pending] = await Promise.all([
    listDirectory(),
    user?.is_admin ? listByStatus("pending") : Promise.resolve([]),
  ]);

  return (
    <>
      <SiteHeader user={user} pendingCount={pending.length} />
      <main className="mx-auto w-full max-w-7xl grow px-4 pt-2 pb-24 sm:px-8">
        <p className="mb-8 max-w-md text-sm leading-relaxed text-parchment-faint">
          Every board here belongs to someone. Open one to see what they are
          holding out for.
        </p>
        <Directory people={people} currentUserId={user?.id ?? null} />
      </main>
    </>
  );
}
