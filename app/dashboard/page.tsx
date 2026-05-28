import { AppNav } from "@/components/app-nav";
import {
  DashboardCharts,
  type CategoryExpenseChartItem,
  type DailyExpenseChartItem,
} from "@/components/dashboard-charts";
import { LogoutButton } from "@/components/logout-button";
import {
  getJakartaMonthYear,
  getMonthDateRange,
  getMonthLabel,
} from "@/lib/date";
import { formatRupiah } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import {
  BarChart3,
  PiggyBank,
  Plus,
  ReceiptText,
  Settings2,
  ShieldCheck,
  Target,
  TrendingDown,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { month, year } = getJakartaMonthYear();
  const { start, end } = getMonthDateRange(month, year);

  const [
    { data: profile },
    { data: categories },
    { data: currentBudget },
    { data: transactions },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("categories")
      .select("name, emoji, tracking_type")
      .order("tracking_type")
      .order("name"),
    supabase
      .from("monthly_budgets")
      .select("income, saving_target")
      .eq("user_id", user.id)
      .eq("month", month)
      .eq("year", year)
      .maybeSingle(),
    supabase
      .from("transactions")
      .select("id, date, amount, categories(name, emoji)")
      .eq("user_id", user.id)
      .gte("date", start)
      .lt("date", end),
  ]);

  const displayName =
    profile?.display_name ||
    user.user_metadata?.display_name ||
    user.email?.split("@")[0] ||
    "Pengguna Gatra";

  const trackingLabels: Record<string, string> = {
    daily: "Harian",
    weekly: "Mingguan",
    monthly: "Bulanan",
  };
  const transactionRows = ((transactions ?? []) as RawDashboardTransaction[]).map(
    normalizeDashboardTransaction,
  );
  const income = toFiniteNumber(currentBudget?.income);
  const savingTarget = toFiniteNumber(currentBudget?.saving_target);
  const totalPengeluaran = transactionRows.reduce(
    (total, transaction) => total + toFiniteNumber(transaction.amount),
    0,
  );
  const transactionCount = transactionRows.length;
  const savingAktual = income - totalPengeluaran;
  const budgetBelanja = income - savingTarget;
  const sisaBudgetAman = budgetBelanja - totalPengeluaran;
  const statusKeuangan = getFinancialStatus(totalPengeluaran, budgetBelanja);
  const kategoriTerbesar = getTopCategory(transactionRows);
  const savingProgress = getSavingProgress(savingAktual, savingTarget);
  const categoryExpenseData = getCategoryExpenseData(
    transactionRows,
    totalPengeluaran,
  );
  const dailyExpenseData = getDailyExpenseData(transactionRows);

  return (
    <main className="min-h-dvh bg-[var(--surface-subtle)] px-4 py-6 text-[var(--foreground)] sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)] sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--primary)]">
              Dashboard
            </p>
            <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">
              Halo, {displayName}
            </h1>
            <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
              Rekap keuanganmu, tersusun jelas.
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
            <LogoutButton />
          </div>
        </header>

        <AppNav active="dashboard" />

        {!currentBudget ? (
          <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5 shadow-[var(--shadow-soft)] sm:flex sm:items-center sm:justify-between sm:gap-4 sm:p-6">
            <div>
              <h2 className="text-lg font-semibold text-blue-950">
                Budget {getMonthLabel(month)} {year} belum diatur
              </h2>
              <p className="mt-2 text-sm leading-6 text-blue-800">
                Isi pemasukan dan target tabungan dulu supaya dashboard bisa
                mulai menghitung rekap bulanan.
              </p>
            </div>
            <Link
              className="mt-4 flex h-12 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 sm:mt-0"
              href="/monthly-setup"
            >
              <Settings2 className="size-5" />
              Atur Budget Bulanan
            </Link>
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={<WalletCards className="size-5" />}
            label="Pemasukan bulan ini"
            value={formatRupiah(income)}
            tone="blue"
          />
          <StatCard
            icon={<TrendingDown className="size-5" />}
            label="Total Pengeluaran"
            value={formatRupiah(totalPengeluaran)}
            tone="red"
          />
          <StatCard
            icon={<PiggyBank className="size-5" />}
            label="Sisa Uang Saat Ini"
            value={formatRupiah(savingAktual)}
            tone={savingAktual >= savingTarget ? "green" : "amber"}
          />
          <StatCard
            icon={<WalletCards className="size-5" />}
            label="Sisa Budget Aman"
            value={formatRupiah(sisaBudgetAman)}
            tone={sisaBudgetAman >= 0 ? "blue" : "red"}
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <SavingProgressPanel
            progress={savingProgress}
          />

          <FinancialStatusPanel
            budgetBelanja={budgetBelanja}
            kategoriTerbesar={kategoriTerbesar}
            statusKeuangan={statusKeuangan}
            transactionCount={transactionCount}
          />
        </section>

        <DashboardCharts
          categoryData={categoryExpenseData}
          dailyData={dailyExpenseData}
        />

        <section className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">
                  Kategori pengeluaran
                </h2>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  Kategori aktif untuk input dan analisis transaksi Gatra.
                </p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
                {categories?.length ?? 0} aktif
              </span>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {categories?.map((category) => (
                <div
                  className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-slate-50 px-4 py-3"
                  key={category.name}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-lg shadow-sm">
                      {category.emoji}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {category.name}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {trackingLabels[category.tracking_type] ??
                          category.tracking_type}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-[var(--primary)]">
              <ShieldCheck className="size-6" />
            </div>
            <h2 className="mt-5 text-lg font-semibold">Kontrol cepat</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
              Akses halaman utama untuk mencatat transaksi, mengatur budget,
              dan membuka rekap bulanan.
            </p>
            <Link
              className="mt-6 flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--foreground)] shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-100"
              href="/transactions"
            >
              <ReceiptText className="size-4" />
              Lihat Riwayat Transaksi
            </Link>
            <Link
              className="mt-3 flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--foreground)] shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-100"
              href="/recap"
            >
              <BarChart3 className="size-4" />
              Lihat Rekap Bulanan
            </Link>
            <Link
              className="mt-3 flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--foreground)] shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-100"
              href="/monthly-setup"
            >
              <Settings2 className="size-4" />
              Atur Budget Bulanan
            </Link>
          </aside>
        </section>
      </div>
    </main>
  );
}

function SavingProgressPanel({
  progress,
}: {
  progress: SavingProgress;
}) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-[var(--accent)]">
            <Target className="size-5" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">Progress target tabungan</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
            Mengukur sisa uang saat ini dibanding target tabungan bulan ini.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
          {progress.label}
        </span>
      </div>

      {progress.isTargetSet ? (
        <>
          <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-[width]"
              style={{ width: `${progress.clampedPercent}%` }}
            />
          </div>
          <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-sm font-semibold text-[var(--foreground)]">
              {progress.headline}
            </p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {progress.detail}
            </p>
          </div>
        </>
      ) : (
        <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          Target tabungan belum diatur. Isi target tabungan di halaman Budget.
        </div>
      )}
    </section>
  );
}

function FinancialStatusPanel({
  budgetBelanja,
  kategoriTerbesar,
  statusKeuangan,
  transactionCount,
}: {
  budgetBelanja: number;
  kategoriTerbesar: ReturnType<typeof getTopCategory>;
  statusKeuangan: FinancialStatus;
  transactionCount: number;
}) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-[var(--primary)]">
            <ShieldCheck className="size-5" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">Status keuangan</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
            Dibaca dari budget belanja dan total pengeluaran bulan berjalan.
          </p>
        </div>
        <FinancialStatusBadge status={statusKeuangan} />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <MiniMetric label="Budget belanja" value={formatRupiah(budgetBelanja)} />
        <MiniMetric label="Transaksi" value={String(transactionCount)} />
        <MiniMetric label="Kategori terbesar" value={kategoriTerbesar.label} />
      </div>
    </section>
  );
}

function FinancialStatusBadge({ status }: { status: FinancialStatus }) {
  const classes = {
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    blue: "bg-blue-50 text-blue-700 ring-blue-200",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    red: "bg-red-50 text-red-700 ring-red-200",
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
  }[status.tone];

  return (
    <span
      className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ring-1 ${classes}`}
    >
      {status.label}
    </span>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-[var(--border)] pt-3">
      <p className="text-xs font-medium text-[var(--muted-foreground)]">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold">{value}</p>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "amber" | "blue" | "green" | "red" | "slate";
}) {
  const tones = {
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
    slate: "bg-slate-100 text-slate-700",
  };

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)]">
      <div className={`flex size-11 items-center justify-center rounded-xl ${tones[tone]}`}>
        {icon}
      </div>
      <p className="mt-4 text-sm text-[var(--muted-foreground)]">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

type DashboardTransaction = {
  amount: number | string;
  categories: {
    emoji: string | null;
    name: string;
  } | null;
  date: string;
};

type RawDashboardTransaction = {
  amount: number | string;
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
  date: string;
};

type FinancialStatus = {
  label: string;
  tone: "amber" | "blue" | "green" | "red" | "slate";
};

type SavingProgress = {
  clampedPercent: number;
  detail: string;
  headline: string;
  isTargetSet: boolean;
  label: string;
};

function normalizeDashboardTransaction(
  transaction: RawDashboardTransaction,
): DashboardTransaction {
  return {
    amount: transaction.amount,
    categories: Array.isArray(transaction.categories)
      ? transaction.categories[0] ?? null
      : transaction.categories,
    date: transaction.date,
  };
}

function getFinancialStatus(
  totalPengeluaran: number,
  budgetBelanja: number,
): FinancialStatus {
  if (budgetBelanja <= 0 && totalPengeluaran === 0) {
    return { label: "Belum aktif", tone: "slate" };
  }

  if (totalPengeluaran < budgetBelanja * 0.75) {
    return { label: "Aman", tone: "green" };
  }

  if (totalPengeluaran <= budgetBelanja) {
    return { label: "Waspada", tone: "amber" };
  }

  return { label: "Boros", tone: "red" };
}

function getTopCategory(transactions: DashboardTransaction[]) {
  const categoryTotals = new Map<string, { label: string; total: number }>();

  transactions.forEach((transaction) => {
    const name = transaction.categories?.name ?? "Tanpa kategori";
    const emoji = transaction.categories?.emoji ?? "";
    const label = emoji ? `${emoji} ${name}` : name;
    const current = categoryTotals.get(name)?.total ?? 0;
    categoryTotals.set(name, {
      label,
      total: current + toFiniteNumber(transaction.amount),
    });
  });

  const topCategory = Array.from(categoryTotals.values()).sort(
    (a, b) => b.total - a.total,
  )[0];

  return {
    label: topCategory ? topCategory.label : "Belum ada",
    total: topCategory?.total ?? 0,
  };
}

function getSavingProgress(
  savingAktual: number,
  savingTarget: number,
): SavingProgress {
  if (savingTarget <= 0) {
    return {
      clampedPercent: 0,
      detail: "Isi target tabungan di halaman Budget.",
      headline: "Target tabungan belum diatur",
      isTargetSet: false,
      label: "Belum diatur",
    };
  }

  const rawPercent = (savingAktual / savingTarget) * 100;
  const safePercent = Number.isFinite(rawPercent) ? rawPercent : 0;
  const clampedPercent = Math.min(Math.max(safePercent, 0), 100);
  const difference = savingAktual - savingTarget;

  if (difference >= 0) {
    return {
      clampedPercent,
      detail:
        difference > 0
          ? `Target ${formatRupiah(savingTarget)} tercapai`
          : "Pas dengan target tabungan.",
      headline:
        difference > 0
          ? `Target tercapai, lebih ${formatRupiah(difference)}`
          : "Target tercapai",
      isTargetSet: true,
      label: "Target tercapai",
    };
  }

  return {
    clampedPercent,
    detail: `Kurang ${formatRupiah(Math.abs(difference))} dari target tabungan`,
    headline: `Target ${formatRupiah(savingTarget)} belum tercapai`,
    isTargetSet: true,
    label: `${Math.round(clampedPercent)}%`,
  };
}

function getCategoryExpenseData(
  transactions: DashboardTransaction[],
  totalPengeluaran: number,
): CategoryExpenseChartItem[] {
  const chartColors = [
    "#2563eb",
    "#059669",
    "#f59e0b",
    "#ef4444",
    "#7c3aed",
    "#0891b2",
    "#db2777",
    "#65a30d",
  ];
  const categoryTotals = new Map<
    string,
    { emoji: string | null; label: string; name: string; total: number }
  >();

  transactions.forEach((transaction) => {
    const name = transaction.categories?.name ?? "Tanpa kategori";
    const emoji = transaction.categories?.emoji ?? null;
    const current = categoryTotals.get(name);

    categoryTotals.set(name, {
      emoji: emoji ?? current?.emoji ?? null,
      label: emoji ? `${emoji} ${name}` : name,
      name,
      total: (current?.total ?? 0) + toFiniteNumber(transaction.amount),
    });
  });

  return Array.from(categoryTotals.values())
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total)
    .map((item, index) => ({
      color: chartColors[index % chartColors.length],
      label: item.label,
      name: item.name,
      percent:
        totalPengeluaran > 0 ? (item.total / totalPengeluaran) * 100 : 0,
      total: item.total,
    }));
}

function getDailyExpenseData(
  transactions: DashboardTransaction[],
): DailyExpenseChartItem[] {
  const dailyTotals = new Map<string, number>();

  transactions.forEach((transaction) => {
    dailyTotals.set(
      transaction.date,
      (dailyTotals.get(transaction.date) ?? 0) +
        toFiniteNumber(transaction.amount),
    );
  });

  return Array.from(dailyTotals.entries())
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([date, total]) => ({
      date,
      label: String(Number(date.slice(8, 10))),
      total,
    }));
}

function toFiniteNumber(value: number | string | null | undefined) {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}
