import { AppNav } from "@/components/app-nav";
import { DeleteIncomeButton } from "@/components/delete-income-button";
import { QuickIncomeButton } from "@/components/quick-entry-modal";
import {
  getJakartaMonthYear,
  getJakartaTodayISO,
  getMonthDateRange,
  getMonthLabel,
  monthOptions,
} from "@/lib/date";
import { formatDateID, formatRupiah } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, Filter, HandCoins, Pencil } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

type IncomePageProps = {
  searchParams: Promise<{
    month?: string;
    year?: string;
  }>;
};

type IncomeRow = {
  amount: number | string;
  date: string;
  id: string;
  note: string | null;
  source: string;
};

export default async function IncomePage({ searchParams }: IncomePageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const currentPeriod = getJakartaMonthYear();
  const params = await searchParams;
  const selectedMonth = normalizeMonth(params.month, currentPeriod.month);
  const selectedYear = normalizeYear(params.year, currentPeriod.year);
  const { start, end } = getMonthDateRange(selectedMonth, selectedYear);
  const todayISO = getJakartaTodayISO();
  const quickEntryDate =
    selectedMonth === currentPeriod.month && selectedYear === currentPeriod.year
      ? todayISO
      : `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from(
    { length: 11 },
    (_, index) => currentYear - 5 + index,
  );

  const { data: incomeEntries } = await supabase
    .from("income_entries")
    .select("id, date, amount, source, note")
    .eq("user_id", user.id)
    .gte("date", start)
    .lt("date", end)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  const rows = (incomeEntries ?? []) as IncomeRow[];
  const totalPemasukanTambahan = rows.reduce(
    (total, entry) => total + toFiniteNumber(entry.amount),
    0,
  );

  return (
    <main className="min-h-dvh bg-[var(--surface-subtle)] px-4 py-6 text-[var(--foreground)] sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--primary)]">
                Pemasukan Tambahan
              </p>
              <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">
                Pemasukan {getMonthLabel(selectedMonth)} {selectedYear}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
                Catat pemasukan dari kerja sampingan, freelance, bonus, atau
                jualan tanpa mengubah pemasukan utama bulanan.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <QuickIncomeButton initialDate={quickEntryDate} />
              <Link
                className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--foreground)] shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-100"
                href="/dashboard"
              >
                <ArrowLeft className="size-4" />
                Dashboard
              </Link>
            </div>
          </div>
        </header>

        <AppNav active="income" />

        <section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6">
          <form className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
            <label className="block">
              <span className="text-sm font-medium">Bulan</span>
              <select
                className="mt-2 h-12 w-full cursor-pointer rounded-xl border border-[var(--border)] bg-white px-3 text-base outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-blue-100"
                defaultValue={selectedMonth}
                name="month"
              >
                {monthOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium">Tahun</span>
              <select
                className="mt-2 h-12 w-full cursor-pointer rounded-xl border border-[var(--border)] bg-white px-3 text-base outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-blue-100"
                defaultValue={selectedYear}
                name="year"
              >
                {yearOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <button
              className="mt-0 flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 sm:mt-7"
              type="submit"
            >
              <Filter className="size-5" />
              Terapkan
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Daftar pemasukan</h2>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                {rows.length} pemasukan tambahan tercatat.
              </p>
            </div>
            <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <span>Total pemasukan tambahan</span>
              <p className="mt-1 text-lg font-semibold">
                {formatRupiah(totalPemasukanTambahan)}
              </p>
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-[var(--border)] bg-slate-50 p-6 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-white text-[var(--primary)] shadow-sm">
                <HandCoins className="size-6" />
              </div>
              <h3 className="mt-4 text-base font-semibold">
                Belum ada pemasukan tambahan
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted-foreground)]">
                Tambahkan pemasukan dari freelance, bonus, atau jualan supaya
                total pemasukan dashboard lebih akurat.
              </p>
              <QuickIncomeButton
                className="mx-auto mt-5 flex h-11 w-full max-w-xs cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-100"
                initialDate={quickEntryDate}
              />
            </div>
          ) : (
            <div className="mt-6 divide-y divide-[var(--border)]">
              {rows.map((entry) => (
                <article
                  className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                  key={entry.id}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[var(--primary)] shadow-sm">
                        <HandCoins className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold">
                          {entry.source}
                        </h3>
                        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                          {formatDateID(entry.date)}
                        </p>
                      </div>
                    </div>
                    {entry.note ? (
                      <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
                        {entry.note}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-3 sm:items-end">
                    <p className="text-base font-semibold tabular-nums text-emerald-700">
                      {formatRupiah(entry.amount)}
                    </p>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Link
                        className="flex h-10 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-blue-100"
                        href={`/income/${entry.id}/edit?month=${selectedMonth}&year=${selectedYear}`}
                      >
                        <Pencil className="size-4" />
                        Edit
                      </Link>
                      <DeleteIncomeButton incomeId={entry.id} />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
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

function toFiniteNumber(value: number | string | null | undefined) {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}
