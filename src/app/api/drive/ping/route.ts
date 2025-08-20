// src/app/api/drive/verify/route.ts  (use your actual path)
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function driveConfigured() {
  const {
    DRIVE_CLIENT_ID,
    DRIVE_CLIENT_SECRET,
    GOOGLE_DRIVE_ADMIN_REFRESH_TOKEN,
    GOOGLE_DRIVE_FOLDER_ID,
  } = process.env;
  return Boolean(
    DRIVE_CLIENT_ID &&
      DRIVE_CLIENT_SECRET &&
      GOOGLE_DRIVE_ADMIN_REFRESH_TOKEN &&
      GOOGLE_DRIVE_FOLDER_ID
  );
}

export async function GET() {
  if (!driveConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Google Drive is not configured." },
      { status: 503 }
    );
  }

  try {
    // Lazy import so env is only read/executed at runtime
    const { verifyDriveFolder } = await import("@/lib/drive-admin");
    const folder = await verifyDriveFolder();
    return NextResponse.json({ ok: true, folder });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
