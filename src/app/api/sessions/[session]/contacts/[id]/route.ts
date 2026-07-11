import { NextResponse } from "next/server";
import { getContact, getContactAbout, WahaError } from "@/lib/waha";
import { requireSessionAccess } from "@/lib/tenancy";

type Params = { params: Promise<{ session: string; id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { session, id } = await params;
  const { response } = await requireSessionAccess(session);
  if (response) return response;

  try {
    const [contact, about] = await Promise.all([
      getContact(session, id),
      getContactAbout(session, id).catch(() => null),
    ]);
    return NextResponse.json({ ...contact, about: about?.about });
  } catch (err) {
    const status = err instanceof WahaError ? err.status : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status },
    );
  }
}
