// src/lib/local-storage.ts
import { promises as fs } from "fs";
import path from "path";

const UPLOAD_DIR = process.env.LOCAL_UPLOAD_DIR || "uploads"; // can be absolute or relative

async function ensureDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

// Write the buffer to disk and return metadata similar to Drive’s API
export async function uploadToLocal({
  fileName,
  mimeType,
  buffer,
}: {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}) {
  await ensureDir();
  const safeName = fileName.replace(/[^A-Za-z0-9._-]/g, "_");
  const filePath = path.join(UPLOAD_DIR, safeName);
  await fs.writeFile(filePath, buffer);
  return {
    id: safeName,
    name: safeName,
    mimeType,
    size: buffer.length,
    path: filePath,
  };
}

// Return a readable stream or Buffer for the file
export async function getLocalFileStream(fileName: string) {
  const filePath = path.join(UPLOAD_DIR, fileName);
  return fs.readFile(filePath);
}

// Delete the file from disk
export async function deleteLocalFile(fileName: string) {
  const filePath = path.join(UPLOAD_DIR, fileName);
  await fs.unlink(filePath);
}
