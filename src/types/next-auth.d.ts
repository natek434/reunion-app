import type { DefaultSession } from "next-auth";
import type { Role } from "@prisma/client"; // or define: type Role = "ADMIN" | "USER";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: Role;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role?: Role;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role?: Role;
  }
}
