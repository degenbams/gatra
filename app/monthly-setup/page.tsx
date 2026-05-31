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

  const [
    { data: currentBudget },
    { data: categories },
    { data: categoryLimits },
  ] = await Promise.all([
    supabase
      .from("monthly_budgets")
      .select("income, saving_target")
      .eq("user_id", user.id)
      .eq("month", month)
      .eq("year", year)
      .maybeSingle(),
    supabase
      .from("categories")
      .select("id, name, emoji, tracking_type")
      .order("tracking_type")
      .order("name"),
    supabase
      .from("category_limits")
      .select("category_id, limit_amount")
      .eq("user_id", user.id)
      .eq("month", month)
      .eq("year", year),
  ]);

  return (
    <main className="min-h-dvh bg-[var(--surface-subtle)] px-4 py-6 text-[var(--foreground)] sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--primary)]">
            Panduan Budget
          </p>
          <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">
            Atur Budget Bulanan
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
            Atur pemasukan utama, target tabungan, dan limit kategori untuk{" "}
            {getMonthLabel(month)} {year}. Gatra akan bantu cek apakah jatah
            harianmu masih realistis.
          </p>
        </header>

        <AppNav active="budget" />

        <MonthlySetupForm
          categories={categories ?? []}
          initialCategoryLimits={categoryLimits ?? []}
          initialBudget={currentBudget}
          initialMonth={month}
          initialYear={year}
        />
      </div>
    </main>
  );
}
