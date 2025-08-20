"use client";
import Link from "next/link";
import { useSession } from "next-auth/react";

export default function NavWhakapapaLink() {
  const { data } = useSession();
  const role = (data?.user as any)?.role;
  const href = role === "ADMIN" ? "/family" : "/tree";
  return <Link className="nav-link" href={href}>Whakapapa</Link>;
}
