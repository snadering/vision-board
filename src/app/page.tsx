import { redirect } from "next/navigation";
import { hasSession } from "@/lib/auth";
import { listVisions } from "@/lib/visions";
import { BoardApp } from "@/components/BoardApp";

export default async function HomePage() {
  // Proxy has already checked this; checking again means a matcher mistake can
  // never expose the board.
  if (!(await hasSession())) redirect("/login");

  const visions = await listVisions();
  return <BoardApp initialVisions={visions} />;
}
