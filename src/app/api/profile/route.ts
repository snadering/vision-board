import { NextResponse } from "next/server";
import { approvedUser } from "@/lib/auth";
import { storeAvatar, updateProfile, usernameTaken } from "@/lib/profiles";
import {
  ACCEPTED_UPLOAD_MIME,
  MAX_UPLOAD_BYTES,
  UPLOAD_EXTENSION,
  usernameProblem,
} from "@/lib/types";

/** Your own settings: username, board visibility, avatar. */
export async function PATCH(request: Request) {
  const user = await approvedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const patch: Parameters<typeof updateProfile>[1] = {};

  const rawUsername = form.get("username");
  if (typeof rawUsername === "string") {
    const username = rawUsername.trim().toLowerCase();
    if (username !== user.username) {
      const problem = usernameProblem(username);
      if (problem) return NextResponse.json({ error: problem }, { status: 400 });
      if (await usernameTaken(username)) {
        return NextResponse.json({ error: "That name is taken." }, { status: 409 });
      }
      patch.username = username;
    }
  }

  const visibility = form.get("board_public");
  if (typeof visibility === "string") {
    patch.board_public = visibility === "true";
  }

  const file = form.get("avatar");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "That picture is too large." }, { status: 400 });
    }
    if (!(ACCEPTED_UPLOAD_MIME as readonly string[]).includes(file.type)) {
      return NextResponse.json({ error: "Unsupported image format." }, { status: 400 });
    }

    try {
      const stored = await storeAvatar(
        user.id,
        await file.arrayBuffer(),
        file.type,
        UPLOAD_EXTENSION[file.type] ?? "webp",
        user.avatar_path,
      );
      patch.avatar_url = stored.url;
      patch.avatar_path = stored.path;
    } catch (error) {
      console.error(error);
      return NextResponse.json(
        { error: "Could not save that picture." },
        { status: 500 },
      );
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ profile: user });
  }

  try {
    return NextResponse.json({ profile: await updateProfile(user.id, patch) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not save those changes." }, { status: 500 });
  }
}
