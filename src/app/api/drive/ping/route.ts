import { NextResponse } from "next/server";
import { verifyDriveFolder } from "@/lib/drive-admin";

export async function GET() {
  try {
    const folder = await verifyDriveFolder();
    return NextResponse.json({ ok: true, folder });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
