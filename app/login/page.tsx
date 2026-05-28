import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/login-form";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="Masuk"
      title="Selamat datang lagi"
      description="Pantau pemasukan, transaksi, dan kategori pengeluaran dari satu dashboard yang ringan dipakai setiap hari."
    >
      <Suspense
        fallback={
          <div className="h-48 animate-pulse rounded-xl bg-slate-100" />
        }
      >
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
