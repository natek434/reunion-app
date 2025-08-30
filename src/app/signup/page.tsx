"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { ensureCsrfToken } from "@/lib/csrf-client";

export default function SignUp() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const onChange = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(v => ({ ...v, [k]: e.target.value }));

  return (
    <div className="max-w-md mx-auto card p-6">
      <h1 className="text-2xl font-semibold mb-4">Create account</h1>
      <form
        onSubmit={async (e) => {
          e.preventDefault();

          const csrf = await ensureCsrfToken();
          if (!csrf) {
            toast.error("Missing CSRF token. Please refresh the page and try again.");
            return;
          }

          const res = await fetch("/api/auth/register", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-CSRF-Token": csrf, // ← send token here
            },
            body: JSON.stringify(form),
            cache: "no-store",
            credentials: "same-origin", // default, but explicit is fine
          });

          if (res.ok) {
            await signIn("credentials", {
              email: form.email,
              password: form.password,
              callbackUrl: "/dashboard",
            });
          } else {
            const data = await res.json().catch(() => ({}));
            toast.error(data?.error || "Sign up failed");
          }
        }}
        className="space-y-3"
      >
        {/* Hidden input not needed when sending JSON + header */}
        <input className="input" placeholder="Name" value={form.name} onChange={onChange("name")} />
        <input className="input" placeholder="Email" value={form.email} onChange={onChange("email")} />
        <input className="input" placeholder="Password (min 7)" type="password" value={form.password} onChange={onChange("password")} />
        <button className="btn btn-primary w-full" type="submit">Sign up</button>
      </form>
    </div>
  );
}
