// src/app/api/drive/whoami/route.ts
import { NextResponse } from "next/server";
import { google } from "googleapis";
import { getAdminDrive } from "@/lib/drive-admin";

export async function GET() {
  try {
    const auth = (getAdminDrive() as any)._options.auth;
    const oauth2 = google.oauth2({ version: "v2", auth });
    const { data } = await oauth2.userinfo.get();
    return NextResponse.json({ ok: true, user: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
