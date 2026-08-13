import { notFound } from "next/navigation";
import { adminUser } from "@/lib/auth";
import { listByStatus, listUnclaimed } from "@/lib/profiles";
import { listInvites } from "@/lib/invites";
import { SiteHeader } from "@/components/SiteHeader";
import { ApprovalQueue } from "@/components/ApprovalQueue";
import { InviteLinks } from "@/components/InviteLinks";

export const metadata = { title: "Queue — Vision Board" };

export default async function AdminPage() {
  const admin = await adminUser();
  // Not an admin, not a page: no hint that there is anything here.
  if (!admin) notFound();

  const [pending, blocked, unclaimed, invites] = await Promise.all([
    listByStatus("pending"),
    listByStatus("blocked"),
    listUnclaimed(),
    listInvites(),
  ]);

  return (
    <>
      <SiteHeader user={admin} pendingCount={pending.length} />
      <main className="mx-auto w-full max-w-2xl grow px-4 pt-2 pb-24 sm:px-8">
        <h1 className="mb-2 font-display text-4xl leading-none text-parchment sm:text-5xl">
          Who gets in
        </h1>
        <p className="mb-8 text-sm text-parchment-faint">
          Hand out a link and people let themselves in; anyone arriving without
          one waits here.
        </p>

        <div className="flex flex-col gap-10">
          <InviteLinks invites={invites} />
          <ApprovalQueue pending={pending} blocked={blocked} unclaimed={unclaimed} />
        </div>
      </main>
    </>
  );
}
