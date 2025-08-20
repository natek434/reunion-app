// src/lib/drive-admin.ts
import { google } from "googleapis";
import { Readable } from "node:stream";

type DriveEnv = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  folderId: string;
  shared: boolean;
};

// ---- Runtime env loader (no top-level reads) ----
function readDriveEnv(): DriveEnv {
  const {
    DRIVE_CLIENT_ID,
    DRIVE_CLIENT_SECRET,
    GOOGLE_DRIVE_ADMIN_REFRESH_TOKEN,
    GOOGLE_DRIVE_FOLDER_ID,
    DRIVE_SHARED,
  } = process.env;

  const miss: string[] = [];
  if (!DRIVE_CLIENT_ID) miss.push("DRIVE_CLIENT_ID");
  if (!DRIVE_CLIENT_SECRET) miss.push("DRIVE_CLIENT_SECRET");
  if (!GOOGLE_DRIVE_ADMIN_REFRESH_TOKEN) miss.push("GOOGLE_DRIVE_ADMIN_REFRESH_TOKEN");
  if (!GOOGLE_DRIVE_FOLDER_ID) miss.push("GOOGLE_DRIVE_FOLDER_ID");
  if (miss.length) throw new Error(`Missing env: ${miss.join(", ")}`);

  const shared =
    String(DRIVE_SHARED ?? "false").toLowerCase() === "true" ||
    String(DRIVE_SHARED ?? "") === "1";

  return {
    clientId: DRIVE_CLIENT_ID!,
    clientSecret: DRIVE_CLIENT_SECRET!,
    refreshToken: GOOGLE_DRIVE_ADMIN_REFRESH_TOKEN!,
    folderId: GOOGLE_DRIVE_FOLDER_ID!,
    shared,
  };
}

// ---- Lazy Google Drive client (memoized) ----
let cached:
  | { key: string; drive: ReturnType<typeof google.drive>; folderId: string; shared: boolean }
  | null = null;

function getDrive() {
  const env = readDriveEnv();
  const key = `${env.clientId}|${env.clientSecret}|${env.refreshToken}|${env.shared}`;
  if (cached && cached.key === key) return cached;

  const oauth2 = new google.auth.OAuth2(env.clientId, env.clientSecret);
  oauth2.setCredentials({ refresh_token: env.refreshToken });
  const drive = google.drive({ version: "v3", auth: oauth2 });

  cached = { key, drive, folderId: env.folderId, shared: env.shared };
  return cached;
}

// ---- Public helpers ----
export async function verifyDriveFolder() {
  const { drive, folderId, shared } = getDrive();
  try {
    const { data } = await drive.files.get({
      fileId: folderId,
      fields: "id,name,mimeType,shortcutDetails,parents",
      supportsAllDrives: shared,
    });

    if (data.mimeType === "application/vnd.google-apps.shortcut") {
      throw new Error(
        "GOOGLE_DRIVE_FOLDER_ID points to a Shortcut. Open it and copy the TARGET folder's ID."
      );
    }
    if (data.mimeType !== "application/vnd.google-apps.folder") {
      throw new Error("GOOGLE_DRIVE_FOLDER_ID is not a folder.");
    }
    return data;
  } catch (e: any) {
    const info = e?.response?.data || e?.message || e;
    console.error("verifyDriveFolder error:", info);
    throw new Error(typeof info === "string" ? info : JSON.stringify(info));
  }
}

export async function uploadToDrive({
  fileName,
  mimeType,
  buffer,
}: {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}) {
  const { drive, folderId, shared } = getDrive();
  await verifyDriveFolder(); // sanity check

  try {
    const res = await drive.files.create({
      requestBody: { name: fileName, parents: [folderId] },
      media: {
        mimeType: mimeType || "application/octet-stream",
        body: Readable.from(buffer),
      },
      fields: "id,name,mimeType,size,webViewLink,thumbnailLink,iconLink",
      supportsAllDrives: shared,
    });
    return res.data;
  } catch (e: any) {
    const info = e?.response?.data || e?.errors || e?.message || e;
    console.error("Drive upload error:", info);
    throw new Error(typeof info === "string" ? info : JSON.stringify(info));
  }
}

export async function getDriveFileStream(fileId: string) {
  const { drive } = getDrive();
  try {
    const { data } = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "stream" }
    );

    // Convert Node Readable -> Web ReadableStream for Next Response
    const nodeStream = data as unknown as NodeJS.ReadableStream;
    const body =
      (Readable as any).toWeb
        ? (Readable as any).toWeb(nodeStream)
        : new ReadableStream({
            start(controller) {
              (nodeStream as any).on("data", (chunk: Buffer) => controller.enqueue(chunk));
              (nodeStream as any).on("end", () => controller.close());
              (nodeStream as any).on("error", (err: unknown) => controller.error(err));
            },
          });

    return body;
  } catch (e: any) {
    const info = e?.response?.data || e?.message || e;
    console.error("Drive get stream error:", info);
    throw new Error(typeof info === "string" ? info : JSON.stringify(info));
  }
}

export async function deleteDriveFile(fileId: string) {
  const { drive } = getDrive();
  await drive.files.delete({ fileId });
}

// Optional: for diagnostics
export function getAdminDrive() {
  const { drive } = getDrive();
  return drive;
}
