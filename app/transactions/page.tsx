import { AppNav } from "@/components/app-nav";
import { DeleteTransactionButton } from "@/components/delete-transaction-button";
import {
  getJakartaMonthYear,
  getMonthDateRange,
  getMonthLabel,
  monthOptions,
} from "@/lib/date";
import { formatDateID, formatRupiah } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, Filter, Pencil, Plus, ReceiptText } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

type TransactionsPageProps = {
  searchParams: Promise<{
    month?: string;
    year?: string;
  }>;
};

type TransactionRow = {
  amount: number | string;
  categories: {
    emoji: string | null;
    name: string;
  } | null;
  date: string;
  id: string;
  note: string | null;
};

type RawTransactionRow = Omit<TransactionRow, "categories"> & {
  categories:
    | {
        emoji: string | null;
        name: string;
      }
    | {
        emoji: string | null;
        name: string;
      }[]
    | null;
};

export default async function TransactionsPage({
  searchParams,
}: TransactionsPageProps) {
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
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from(
    { length: 11 },
    (_, index) => currentYear - 5 + index,
  );

  const { data: transactions } = await supabase
    .from("transactions")
    .select("id, date, amount, note, categories(name, emoji)")
    .eq("user_id", user.id)
    .gte("date", start)
    .lt("date", end)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  const rows = ((transactions ?? []) as RawTransactionRow[]).map(
    normalizeTransactionRow,
  );
  const totalPengeluaran = rows.reduce(
    (total, transaction) => total + Number(transaction.amount ?? 0),
    0,
  );

  return (
    <main className="min-h-dvh bg-[var(--surface-subtle)] px-4 py-6 text-[var(--foreground)] sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
                Riwayat Transaksi
              </p>
              <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">
                Transaksi {getMonthLabel(selectedMonth)} {selectedYear}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
                Data yang tampil hanya transaksi milik akun login saat ini.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-100"
                href="/transactions/new"
              >
                <Plus className="size-4" />
                Tambah Transaksi
              </Link>
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

        <AppNav active="transactions" />

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
              <h2 className="text-lg font-semibold">Daftar transaksi</h2>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                {rows.length} transaksi tercatat.
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm">
              <span className="text-[var(--muted-foreground)]">
                Total pengeluaran
              </span>
              <p className="mt-1 text-lg font-semibold">
                {formatRupiah(totalPengeluaran)}
              </p>
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-[var(--border)] bg-slate-50 p-6 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-white text-[var(--accent)] shadow-sm">
                <ReceiptText className="size-6" />
              </div>
              <h3 className="mt-4 text-base font-semibold">
                Belum ada transaksi
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted-foreground)]">
                Catat pengeluaran pertama untuk periode ini agar dashboard bisa
                menghitung status keuangan.
              </p>
              <Link
                className="mx-auto mt-5 flex h-11 w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-100"
                href="/transactions/new"
              >
                <Plus className="size-4" />
                Tambah Transaksi
              </Link>
            </div>
          ) : (
            <div className="mt-6 divide-y divide-[var(--border)]">
              {rows.map((transaction) => (
                <article
                  className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                  key={transaction.id}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-lg shadow-sm">
                        {transaction.categories?.emoji ?? "•"}
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold">
                          {transaction.categories?.name ?? "Tanpa kategori"}
                        </h3>
                        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                          {formatDateID(transaction.date)}
                        </p>
                      </div>
                    </div>
                    {transaction.note ? (
                      <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
                        {transaction.note}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-3 sm:items-end">
                    <p className="text-base font-semibold tabular-nums text-red-700">
                      {formatRupiah(transaction.amount)}
                    </p>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Link
                        className="flex h-10 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-blue-100"
                        href={`/transactions/${transaction.id}/edit?month=${selectedMonth}&year=${selectedYear}`}
                      >
                        <Pencil className="size-4" />
                        Edit
                      </Link>
                      <DeleteTransactionButton transactionId={transaction.id} />
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

function normalizeTransactionRow(transaction: RawTransactionRow): TransactionRow {
  return {
    ...transaction,
    categories: Array.isArray(transaction.categories)
      ? transaction.categories[0] ?? null
      : transaction.categories,
  };
}
