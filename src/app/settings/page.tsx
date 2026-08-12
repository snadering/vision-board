import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { SiteHeader } from "@/components/SiteHeader";
import { SettingsForm } from "@/components/SettingsForm";

export const metadata = { title: "Settings — Vision Board" };

export default async function SettingsPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/settings");
  if (user.status !== "approved") redirect("/pending");

  return (
    <>
      <SiteHeader user={user} />
      <main className="mx-auto w-full max-w-lg grow px-4 pt-2 pb-24 sm:px-8">
        <h1 className="mb-8 font-display text-4xl leading-none text-parchment sm:text-5xl">
          Settings
        </h1>
        <SettingsForm profile={user} />
      </main>
    </>
  );
}
