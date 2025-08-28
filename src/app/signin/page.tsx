"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function SignIn() {
  const [email, setEmail] = useState(""); 
  const [password, setPassword] = useState("");

  return (
    <div className="max-w-md mx-auto card p-6">
      <h1 className="text-2xl font-semibold mb-4">Sign in</h1>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await signIn("credentials", { email, password, callbackUrl: "/dashboard" });
        }}
        className="space-y-3"
      >
        <input className="input" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} />
        <input className="input" placeholder="Password" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
        <button className="btn btn-primary w-full" type="submit">Sign in</button>
      </form>
      <div className="my-4 text-center text-sm ">or</div>
      <button className="btn w-full" onClick={() => signIn("google", { callbackUrl: "/dashboard" })}>
        Continue with Google
      </button>
      <div className="mt-6 text-center text-sm">
        No account? <a className="underline" href="/signup">Sign up</a>
      </div>
    </div>
  );
}
