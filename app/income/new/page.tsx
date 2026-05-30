import { AppNav } from "@/components/app-nav";
import { IncomeForm } from "@/components/income-form";
import { getJakartaTodayISO } from "@/lib/date";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function NewIncomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-dvh bg-[var(--surface-subtle)] px-4 py-6 text-[var(--foreground)] sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <header className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--primary)]">
            Input Pemasukan
          </p>
          <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">
            Tambah Pemasukan Tambahan
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
            Simpan pemasukan sampingan dengan tanggal, sumber, nominal, dan
            catatan opsional.
          </p>
        </header>

        <AppNav active="income" />

        <IncomeForm initialDate={getJakartaTodayISO()} />
      </div>
    </main>
  );
}
