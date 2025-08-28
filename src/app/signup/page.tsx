"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function SignUp() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const onChange = (k: string) => (e: any) => setForm(v => ({ ...v, [k]: e.target.value }));

  return (
    <div className="max-w-md mx-auto card p-6">
      <h1 className="text-2xl font-semibold mb-4">Create account</h1>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const res = await fetch("/api/auth/register", { method: "POST", body: JSON.stringify(form) });
          if (res.ok) await signIn("credentials", { email: form.email, password: form.password, callbackUrl: "/dashboard" });
          else alert("Sign up failed");
        }}
        className="space-y-3"
      >
        <input className="input" placeholder="Name" value={form.name} onChange={onChange("name")} />
        <input className="input" placeholder="Email" value={form.email} onChange={onChange("email")} />
        <input className="input" placeholder="Password (min 7)" type="password" value={form.password} onChange={onChange("password")} />
        <button className="btn btn-primary w-full" type="submit">Sign up</button>
      </form>
    </div>
  );
}
