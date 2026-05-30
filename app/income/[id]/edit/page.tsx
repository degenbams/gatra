import { AppNav } from "@/components/app-nav";
import { IncomeForm } from "@/components/income-form";
import { getMonthLabel } from "@/lib/date";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, HandCoins } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

type EditIncomePageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    month?: string;
    year?: string;
  }>;
};

type IncomeRecord = {
  amount: number | string;
  date: string;
  id: string;
  note: string | null;
  source: string;
};

export default async function EditIncomePage({
  params,
  searchParams,
}: EditIncomePageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const { data: income } = await supabase
    .from("income_entries")
    .select("id, date, amount, source, note")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!income) {
    return (
      <main className="min-h-dvh bg-[var(--surface-subtle)] px-4 py-6 text-[var(--foreground)] sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
          <section className="rounded-2xl border border-red-100 bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-red-50 text-red-700">
              <HandCoins className="size-6" />
            </div>
            <h1 className="mt-5 text-2xl font-semibold">
              Pemasukan tidak ditemukan
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
              Pemasukan ini tidak ada atau bukan milik akun yang sedang login.
            </p>
            <Link
              className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--foreground)] shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-100 sm:w-fit"
              href="/income"
            >
              <ArrowLeft className="size-4" />
              Kembali ke Pemasukan
            </Link>
          </section>
        </div>
      </main>
    );
  }

  const query = await searchParams;
  const incomeRecord = income as IncomeRecord;
  const selectedMonth = normalizeMonth(
    query.month,
    Number(incomeRecord.date.slice(5, 7)),
  );
  const selectedYear = normalizeYear(
    query.year,
    Number(incomeRecord.date.slice(0, 4)),
  );
  const returnHref = `/income?month=${selectedMonth}&year=${selectedYear}`;

  return (
    <main className="min-h-dvh bg-[var(--surface-subtle)] px-4 py-6 text-[var(--foreground)] sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <header className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--primary)]">
            Edit Pemasukan
          </p>
          <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">
            Ubah Pemasukan Tambahan
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
            Perbarui pemasukan untuk riwayat {getMonthLabel(selectedMonth)}{" "}
            {selectedYear}. Perubahan akan otomatis terbaca di dashboard dan
            rekap bulanan.
          </p>
        </header>

        <AppNav active="income" />

        <IncomeForm
          initialDate={incomeRecord.date}
          initialIncome={incomeRecord}
          mode="edit"
          returnHref={returnHref}
        />
      </div>
    </main>
  );
}

function normalizeMonth(value: string | undefined, fallback: number) {
  const month = Number(value);
  return Number.isInteger(month) && month >= 1 && month <= 12
    ? month
    : fallback;
}

function normalizeYear(value: string | undefined, fallback: number) {
  const year = Number(value);
  return Number.isInteger(year) && year >= 2000 && year <= 2100
    ? year
    : fallback;
}
