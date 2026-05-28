"use client";

import { createClient } from "@/lib/supabase/browser";
import { getAuthErrorMessage } from "@/lib/auth-error-message";
import { Lock, Mail, User, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function RegisterForm() {
  const router = useRouter();
  const supabase = createClient();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSuccess(false);

    if (password.length < 6) {
      setMessage("Password minimal 6 karakter.");
      return;
    }

    setIsLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setIsLoading(false);
      setMessage(
        getAuthErrorMessage(
          error.message,
          "Registrasi belum berhasil. Coba lagi nanti.",
        ),
      );
      return;
    }

    if (data.user && data.session) {
      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          user_id: data.user.id,
          display_name: displayName,
        },
        { onConflict: "user_id" },
      );

      setIsLoading(false);

      if (profileError) {
        setMessage("Akun dibuat, tapi profil belum tersimpan otomatis.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
      return;
    }

    setIsLoading(false);
    setIsSuccess(true);
    setMessage("Pendaftaran berhasil. Silakan cek email untuk verifikasi akun.");
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <label className="block">
        <span className="text-sm font-medium text-[var(--foreground)]">
          Nama tampilan
        </span>
        <span className="mt-2 flex h-12 items-center gap-3 rounded-xl border border-[var(--border)] bg-white px-3 transition focus-within:border-[var(--accent)] focus-within:ring-4 focus-within:ring-emerald-100">
          <User className="size-5 text-[var(--muted-foreground)]" />
          <input
            className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-slate-400"
            type="text"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Nama panggilan"
            autoComplete="name"
            required
          />
        </span>
      </label>

      <label className="block">
        <span className="text-sm font-medium text-[var(--foreground)]">
          Email
        </span>
        <span className="mt-2 flex h-12 items-center gap-3 rounded-xl border border-[var(--border)] bg-white px-3 transition focus-within:border-[var(--accent)] focus-within:ring-4 focus-within:ring-emerald-100">
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
        <span className="mt-2 flex h-12 items-center gap-3 rounded-xl border border-[var(--border)] bg-white px-3 transition focus-within:border-[var(--accent)] focus-within:ring-4 focus-within:ring-emerald-100">
          <Lock className="size-5 text-[var(--muted-foreground)]" />
          <input
            className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-slate-400"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Minimal 6 karakter"
            autoComplete="new-password"
            required
          />
        </span>
      </label>

      {message ? (
        <p
          className={`rounded-xl border px-4 py-3 text-sm ${
            isSuccess
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
          role="alert"
        >
          {message}
        </p>
      ) : null}

      <button
        className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={isLoading}
      >
        <UserPlus className="size-5" />
        {isLoading ? "Mendaftarkan..." : "Buat Akun"}
      </button>

      <p className="text-center text-sm text-[var(--muted-foreground)]">
        Sudah punya akun?{" "}
        <Link className="font-semibold text-[var(--accent)]" href="/login">
          Masuk
        </Link>
      </p>
    </form>
  );
}
