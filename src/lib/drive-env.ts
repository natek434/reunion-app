// src/lib/drive-env.ts
import { z } from "zod";

const schema = z.object({
  DRIVE_CLIENT_ID: z.string().min(1),
  DRIVE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_DRIVE_ADMIN_REFRESH_TOKEN: z.string().min(1),
  GOOGLE_DRIVE_FOLDER_ID: z.string().min(1),
});

export function getDriveEnv() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const missing = Object.keys(schema.shape).filter(k => !process.env[k as keyof NodeJS.ProcessEnv]);
    throw new Error(`Missing env: ${missing.join(", ")}`);
  }
  return parsed.data;
}
