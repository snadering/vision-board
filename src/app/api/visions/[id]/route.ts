import { NextResponse } from "next/server";
import { hasSession } from "@/lib/auth";
import { deleteVision } from "@/lib/visions";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/visions/[id]">,
) {
  if (!(await hasSession())) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!UUID.test(id)) {
    return NextResponse.json({ error: "Unknown vision." }, { status: 400 });
  }

  try {
    const deleted = await deleteVision(id);
    if (!deleted) {
      return NextResponse.json({ error: "Unknown vision." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not delete that vision." }, { status: 500 });
  }
}
