import { NextRequest, NextResponse } from "next/server";
import { getCurrentFullUser } from "@/lib/currentUser";
import { countUnread, listNotificationsFor, markAllAsRead, markAsRead } from "@/lib/notifications";
import { parseJsonBody } from "@/lib/parseJsonBody";

export async function GET() {
  const user = await getCurrentFullUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({
    notifications: listNotificationsFor(user.id),
    unreadCount: countUnread(user.id),
  });
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentFullUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { body, response: parseError } = await parseJsonBody(req);
  if (parseError) return parseError;
  const { id, all } = body!;

  if (all === true) {
    markAllAsRead(user.id);
  } else if (typeof id === "string") {
    markAsRead(user.id, id);
  } else {
    return NextResponse.json({ error: "id atau all wajib diisi" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
