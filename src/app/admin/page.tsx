import { notFound } from "next/navigation";
import { adminUser } from "@/lib/auth";
import { listByStatus, listUnclaimed } from "@/lib/profiles";
import { SiteHeader } from "@/components/SiteHeader";
import { ApprovalQueue } from "@/components/ApprovalQueue";

export const metadata = { title: "Queue — Vision Board" };

export default async function AdminPage() {
  const admin = await adminUser();
  // Not an admin, not a page: no hint that there is anything here.
  if (!admin) notFound();

  const [pending, blocked, unclaimed] = await Promise.all([
    listByStatus("pending"),
    listByStatus("blocked"),
    listUnclaimed(),
  ]);

  return (
    <>
      <SiteHeader user={admin} pendingCount={pending.length} />
      <main className="mx-auto w-full max-w-2xl grow px-4 pt-2 pb-24 sm:px-8">
        <h1 className="mb-2 font-display text-4xl leading-none text-parchment sm:text-5xl">
          Who gets in
        </h1>
        <p className="mb-8 text-sm text-parchment-faint">
          People who have signed in with Google and are waiting for a board.
        </p>
        <ApprovalQueue pending={pending} blocked={blocked} unclaimed={unclaimed} />
      </main>
    </>
  );
}
