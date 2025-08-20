import { google } from "googleapis";
import { Readable } from "node:stream";


const CLIENT_ID = process.env.DRIVE_CLIENT_ID!;         // <-- use DRIVE_* here
const CLIENT_SECRET = process.env.DRIVE_CLIENT_SECRET!;
const REFRESH_TOKEN = process.env.GOOGLE_DRIVE_ADMIN_REFRESH_TOKEN!;
export const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID!;

// Set true only if the folder is in a Shared Drive
const USING_SHARED_DRIVE = false;

function assertEnv() {
  const miss: string[] = [];
  if (!CLIENT_ID) miss.push("DRIVE_CLIENT_ID");
  if (!CLIENT_SECRET) miss.push("DRIVE_CLIENT_SECRET");
  if (!REFRESH_TOKEN) miss.push("GOOGLE_DRIVE_ADMIN_REFRESH_TOKEN");
  if (!DRIVE_FOLDER_ID) miss.push("GOOGLE_DRIVE_FOLDER_ID");
  if (miss.length) throw new Error(`Missing env: ${miss.join(", ")}`);
}
assertEnv();

const oauth2 = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
oauth2.setCredentials({ refresh_token: REFRESH_TOKEN });

function drive() {
  return google.drive({ version: "v3", auth: oauth2 });
}

export async function verifyDriveFolder() {
  assertEnv();
  try {
    const { data } = await drive().files.get({
      fileId: DRIVE_FOLDER_ID,
      fields: "id,name,mimeType,shortcutDetails,parents",
      supportsAllDrives: USING_SHARED_DRIVE,
    });

    if (data.mimeType === "application/vnd.google-apps.shortcut") {
      throw new Error("GOOGLE_DRIVE_FOLDER_ID points to a Shortcut. Open it and copy the TARGET folder's ID.");
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
  await verifyDriveFolder();
  try {
    const res = await drive().files.create({
      requestBody: { name: fileName, parents: [DRIVE_FOLDER_ID] },
      media: {
  mimeType: mimeType || "application/octet-stream",
  body: Readable.from(buffer),
},

      fields: "id,name,mimeType,size,webViewLink,thumbnailLink,iconLink",
      supportsAllDrives: USING_SHARED_DRIVE,
    });
    return res.data;
  } catch (e: any) {
    const info = e?.response?.data || e?.errors || e?.message || e;
    console.error("Drive upload error:", info);
    throw new Error(typeof info === "string" ? info : JSON.stringify(info));
  }
}

export async function getDriveFileStream(fileId: string) {
  try {
    const { data } = await drive().files.get(
      { fileId, alt: "media" },
      { responseType: "stream" }
    );

    // convert Node stream -> Web ReadableStream
    const stream = new ReadableStream({
      start(controller) {
        (data as any).on("data", (chunk: Buffer) => controller.enqueue(chunk));
        (data as any).on("end", () => controller.close());
        (data as any).on("error", (err: unknown) => controller.error(err));
      },
    });

    return stream;
  } catch (e: any) {
    const info = e?.response?.data || e?.message || e;
    console.error("Drive get stream error:", info);
    throw new Error(typeof info === "string" ? info : JSON.stringify(info));
  }
}

export async function deleteDriveFile(fileId: string) {
  const d = getAdminDrive();
  await d.files.delete({ fileId });
}


// optional: keep for debug routes like /api/drive/whoami
export function getAdminDrive() {
  return drive();
}
