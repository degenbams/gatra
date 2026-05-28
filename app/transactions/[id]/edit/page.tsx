import { AppNav } from "@/components/app-nav";
import { TransactionForm } from "@/components/transaction-form";
import { getMonthLabel } from "@/lib/date";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, ReceiptText } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

type EditTransactionPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    month?: string;
    year?: string;
  }>;
};

type TransactionRecord = {
  amount: number | string;
  category_id: string | null;
  date: string;
  id: string;
  note: string | null;
};

export default async function EditTransactionPage({
  params,
  searchParams,
}: EditTransactionPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const [{ data: transaction }, { data: categories }] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, date, amount, note, category_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("categories")
      .select("id, name, emoji, tracking_type")
      .order("tracking_type")
      .order("name"),
  ]);

  if (!transaction) {
    return (
      <main className="min-h-dvh bg-[var(--surface-subtle)] px-4 py-6 text-[var(--foreground)] sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
          <section className="rounded-2xl border border-red-100 bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-red-50 text-red-700">
              <ReceiptText className="size-6" />
            </div>
            <h1 className="mt-5 text-2xl font-semibold">
              Transaksi tidak ditemukan
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
              Transaksi ini tidak ada atau bukan milik akun yang sedang login.
            </p>
            <Link
              className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--foreground)] shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-100 sm:w-fit"
              href="/transactions"
            >
              <ArrowLeft className="size-4" />
              Kembali ke Riwayat
            </Link>
          </section>
        </div>
      </main>
    );
  }

  const query = await searchParams;
  const transactionRecord = transaction as TransactionRecord;
  const selectedMonth = normalizeMonth(
    query.month,
    Number(transactionRecord.date.slice(5, 7)),
  );
  const selectedYear = normalizeYear(
    query.year,
    Number(transactionRecord.date.slice(0, 4)),
  );
  const returnHref = `/transactions?month=${selectedMonth}&year=${selectedYear}`;

  return (
    <main className="min-h-dvh bg-[var(--surface-subtle)] px-4 py-6 text-[var(--foreground)] sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <header className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
            Edit Transaksi
          </p>
          <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">
            Ubah Transaksi
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
            Perbarui transaksi untuk riwayat {getMonthLabel(selectedMonth)}{" "}
            {selectedYear}. Perubahan akan otomatis terbaca di dashboard dan
            rekap bulanan.
          </p>
        </header>

        <AppNav active="transactions" />

        <TransactionForm
          categories={categories ?? []}
          initialDate={transactionRecord.date}
          initialTransaction={transactionRecord}
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
