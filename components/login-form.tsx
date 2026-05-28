"use client";

import { createClient } from "@/lib/supabase/browser";
import { getAuthErrorMessage } from "@/lib/auth-error-message";
import { Lock, LogIn, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsLoading(false);

    if (error) {
      setMessage(
        getAuthErrorMessage(
          error.message,
          "Email atau password belum cocok. Coba cek lagi, ya.",
        ),
      );
      return;
    }

    router.push(searchParams.get("next") || "/dashboard");
    router.refresh();
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <label className="block">
        <span className="text-sm font-medium text-[var(--foreground)]">
          Email
        </span>
        <span className="mt-2 flex h-12 items-center gap-3 rounded-xl border border-[var(--border)] bg-white px-3 transition focus-within:border-[var(--primary)] focus-within:ring-4 focus-within:ring-blue-100">
          <Mail className="size-5 text-[var(--muted-foreground)]" />
          <input
            className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-slate-400"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="nama@email.com"
            autoComplete="email"
            required
          />
        </span>
      </label>

      <label className="block">
        <span className="text-sm font-medium text-[var(--foreground)]">
          Password
        </span>
        <span className="mt-2 flex h-12 items-center gap-3 rounded-xl border border-[var(--border)] bg-white px-3 transition focus-within:border-[var(--primary)] focus-within:ring-4 focus-within:ring-blue-100">
          <Lock className="size-5 text-[var(--muted-foreground)]" />
          <input
            className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-slate-400"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Minimal 6 karakter"
            autoComplete="current-password"
            required
          />
        </span>
      </label>

      {message ? (
        <p
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {message}
        </p>
      ) : null}

      <button
        className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={isLoading}
      >
        <LogIn className="size-5" />
        {isLoading ? "Masuk..." : "Masuk ke Dashboard"}
      </button>

      <p className="text-center text-sm text-[var(--muted-foreground)]">
        Belum punya akun?{" "}
        <Link className="font-semibold text-[var(--primary)]" href="/register">
          Daftar dulu
        </Link>
      </p>
    </form>
  );
}
