import { redirect } from "next/navigation";
import { hasSession } from "@/lib/auth";
import { LoginForm } from "@/components/LoginForm";

export const metadata = {
  title: "Vision Board",
};

export default async function LoginPage() {
  if (await hasSession()) redirect("/");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-20">
      <LoginForm />
    </main>
  );
}
