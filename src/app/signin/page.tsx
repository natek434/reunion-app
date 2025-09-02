"use client";

import { useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { ensureCsrfToken } from "@/lib/csrf-client";

function sameOrigin(dest: string) {
  try {
    const u = new URL(dest, window.location.origin);
    return u.origin === window.location.origin ? u.href : "/dashboard";
  } catch {
    return "/dashboard";
  }
}

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetBusy, setResetBusy] = useState(false);

  // Prefer callbackUrl from query (NextAuth sticks it there), else /dashboard
  const dest = useMemo(() => {
    if (typeof window === "undefined") return "/dashboard";
    const qp = new URLSearchParams(window.location.search);
    const cb = qp.get("callbackUrl");
    return sameOrigin(cb || "/dashboard");
  }, []);

  async function handleCredentialsSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSigningIn(true);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false, // we will navigate ourselves
      });

      if (res?.error) {
        toast.error("Sign-in failed", {
          description: "Wrong email or password — or this account uses Google sign-in.",
        });
        return;
      }

      // Hard nav reliably carries the new cookie past middleware
      window.location.assign(dest);
    } catch (err: any) {
      toast.error("Could not sign in", { description: String(err?.message || "") });
    } finally {
      setSigningIn(false);
    }
  }

  async function requestPasswordReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const targetEmail = resetEmail.trim() || email.trim();
    if (!targetEmail) {
      toast.error("Enter your email to reset your password.");
      return;
    }
    try {
      setResetBusy(true);
      const csrf = await ensureCsrfToken();
      if (!csrf) {
        toast.error("Missing CSRF token. Please refresh and try again.");
        return;
      }
      const res = await fetch("/api/account/password/reset-request", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
        body: JSON.stringify({ email: targetEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not send reset link");
      toast.success("Check your email for a reset link.");
      setShowReset(false);
      setResetEmail("");
    } catch (err: any) {
      toast.error("Unable to send reset link", { description: String(err?.message || "").slice(0, 160) });
    } finally {
      setResetBusy(false);
    }
  }

  return (
    <div className="max-w-md mx-auto card p-6">
      <h1 className="text-2xl font-semibold mb-4">Sign in</h1>

      <form onSubmit={handleCredentialsSignIn} className="space-y-3">
        <input className="input" placeholder="Email" type="email" autoComplete="email"
               value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="input" placeholder="Password" type="password" autoComplete="current-password"
               value={password} onChange={(e) => setPassword(e.target.value)} />

        <div className="flex items-center justify-between">
          <button className="btn btn-primary" type="submit" disabled={signingIn}>
            {signingIn ? "Signing in…" : "Sign in"}
          </button>
          <button type="button" className="text-sm underline opacity-80 hover:opacity-100"
                  onClick={() => setShowReset((s) => !s)}>
            {showReset ? "Close reset" : "Forgot password?"}
          </button>
        </div>
      </form>

      {showReset && (
        <form onSubmit={requestPasswordReset} className="mt-4 space-y-3 rounded-xl border p-4">
          <div className="text-sm">We’ll email you a link to set a new password.</div>
          <input className="input" placeholder="Your email" type="email" autoComplete="email"
                 value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} />
          <button className="btn w-full" type="submit" disabled={resetBusy}>
            {resetBusy ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}

      <div className="my-4 text-center text-sm">or</div>

      <button
        className="btn w-full"
        onClick={() => {
          // Keep OAuth round-trip; also honor callbackUrl when present
          signIn("google", { redirectTo: dest, callbackUrl: dest, prompt: "select_account" });
        }}
      >
        Continue with Google
      </button>

      <div className="mt-6 text-center text-sm">
        No account? <a className="underline" href="/signup">Sign up</a>
      </div>
    </div>
  );
}
