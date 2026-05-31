import { AppNav } from "@/components/app-nav";
import { MonthlySetupForm } from "@/components/monthly-setup-form";
import { getJakartaMonthYear, getMonthLabel } from "@/lib/date";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function MonthlySetupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { month, year } = getJakartaMonthYear();

  const { data: currentBudget } = await supabase
    .from("monthly_budgets")
    .select("income, saving_target")
    .eq("user_id", user.id)
    .eq("month", month)
    .eq("year", year)
    .maybeSingle();

  return (
    <main className="min-h-dvh bg-[var(--surface-subtle)] px-4 py-6 text-[var(--foreground)] sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--primary)]">
            Budget Onboarding
          </p>
          <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">
            Atur Budget Bulanan
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
            Setup awal untuk {getMonthLabel(month)} {year}. Isi pemasukan,
            pilih target tabungan, lalu cek apakah jatah harian masih realistis.
          </p>
        </header>

        <AppNav active="budget" />

        <MonthlySetupForm
          initialBudget={currentBudget}
          initialMonth={month}
          initialYear={year}
        />
      </div>
    </main>
  );
}
