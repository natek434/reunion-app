// src/app/fonts.ts
import { Fraunces } from "next/font/google"; // beautiful serif display
export const brandFont = Fraunces({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-brand",
});
