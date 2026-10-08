import { AppNav } from "@/components/app-nav";
import {
  DashboardCharts,
  type CategoryExpenseChartItem,
  type DailyExpenseChartItem,
} from "@/components/dashboard-charts";
import { DetailTabs } from "@/components/dashboard-detail-tabs";
import { LogoutButton } from "@/components/logout-button";
import { MonthlyInsightsPanel } from "@/components/monthly-insights-panel";
import {
  buildCategoryLimitItems,
  getCategoryLimitTotals,
  type CategoryLimitItem,
} from "@/lib/category-limits";
import {
  getJakartaMonthYear,
  getJakartaTodayISO,
  getMonthDateRange,
  getMonthLabel,
  getRemainingDaysInMonth,
} from "@/lib/date";
import { formatRupiah } from "@/lib/format";
import { buildMonthlyInsights } from "@/lib/monthly-insights";
import { createClient } from "@/lib/supabase/server";
import { Plus, Settings2 } from "lucide-react";
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
    { data: incomeEntries },
    { data: transactions },
    { data: categoryLimits },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("categories")
      .select("id, name, emoji, tracking_type")
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
      .from("income_entries")
      .select("amount")
      .eq("user_id", user.id)
      .gte("date", start)
      .lt("date", end),
    supabase
      .from("transactions")
      .select("id, date, amount, category_id, categories(name, emoji)")
      .eq("user_id", user.id)
      .gte("date", start)
      .lt("date", end),
    supabase
      .from("category_limits")
      .select("category_id, limit_amount")
      .eq("user_id", user.id)
      .eq("month", month)
      .eq("year", year),
  ]);

  const displayName =
    profile?.display_name ||
    user.user_metadata?.display_name ||
    user.email?.split("@")[0] ||
    "Pengguna Gatra";

  const transactionRows = ((transactions ?? []) as RawDashboardTransaction[]).map(
    normalizeDashboardTransaction,
  );
  const todayISO = getJakartaTodayISO();
  const remainingDays = getRemainingDaysInMonth(todayISO);
  const pemasukanUtama = toFiniteNumber(currentBudget?.income);
  const pemasukanTambahan = (incomeEntries ?? []).reduce(
    (total, entry) => total + toFiniteNumber(entry.amount),
    0,
  );
  const totalIncome = pemasukanUtama + pemasukanTambahan;
  const savingTarget = toFiniteNumber(currentBudget?.saving_target);
  const totalPengeluaran = transactionRows.reduce(
    (total, transaction) => total + toFiniteNumber(transaction.amount),
    0,
  );
  const pengeluaranHariIni = transactionRows
    .filter((transaction) => transaction.date === todayISO)
    .reduce(
      (total, transaction) => total + toFiniteNumber(transaction.amount),
      0,
    );
  const transactionCount = transactionRows.length;
  const savingAktual = totalIncome - totalPengeluaran;
  const budgetBelanja = totalIncome - savingTarget;
  const sisaBudgetAman = budgetBelanja - totalPengeluaran;
  const statusKeuangan = getFinancialStatus(totalPengeluaran, budgetBelanja);
  const kategoriTerbesar = getTopCategory(transactionRows);
  const savingProgress = getSavingProgress(savingAktual, savingTarget);
  const dailySafeSpend = getDailySafeSpend({
    budgetBelanja,
    hasBudget: Boolean(currentBudget),
    pengeluaranHariIni,
    remainingDays,
    sisaBudgetAman,
    totalPengeluaran,
    totalIncome,
  });
  const categoryExpenseData = getCategoryExpenseData(
    transactionRows,
    totalPengeluaran,
  );
  const dailyExpenseData = getDailyExpenseData(transactionRows);
  const categoryLimitItems = buildCategoryLimitItems({
    categories: categories ?? [],
    limits: categoryLimits ?? [],
    transactions: transactionRows,
  });
  const categoryLimitTotals = getCategoryLimitTotals(categoryLimitItems);
  const monthlyInsights = buildMonthlyInsights({
    budgetBelanja,
    categoryBreakdown: categoryExpenseData,
    categoryLimitItems,
    hasBudget: Boolean(currentBudget),
    savingAktual,
    savingTarget,
    sisaBudgetAman,
    totalIncome,
    totalPengeluaran,
    transactionCount,
  });
  const periodLabel = `${getMonthLabel(month)} ${year}`;

  return (
    <main className="min-h-dvh bg-[var(--surface-subtle)] px-4 py-6 text-[var(--foreground)] sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Halo, {displayName}
            </h1>
            <p className="mt-1.5 text-sm text-[var(--muted-foreground)]">
              {periodLabel} · {remainingDays} hari lagi
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--foreground)] shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-100"
              href="/monthly-setup"
            >
              <Settings2 className="size-4" />
              Atur budget
            </Link>
            <Link
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100"
              href="/transactions/new"
            >
              <Plus className="size-4" />
              Tambah transaksi
            </Link>
            <LogoutButton />
          </div>
        </header>

        <AppNav active="dashboard" />

        {!currentBudget ? (
          <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5 shadow-[var(--shadow-soft)] sm:flex sm:items-center sm:justify-between sm:gap-4 sm:p-6">
            <div>
              <h2 className="text-lg font-semibold text-blue-950">
                Budget {periodLabel} belum diatur
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
              Atur budget bulanan
            </Link>
          </section>
        ) : null}

        <AllowanceHero
          budgetBelanja={budgetBelanja}
          kategoriLabel={kategoriTerbesar.label}
          remainingDays={remainingDays}
          safeSpend={dailySafeSpend}
          savingProgress={savingProgress}
          savingTarget={savingTarget}
          status={statusKeuangan}
          totalIncome={totalIncome}
          totalPengeluaran={totalPengeluaran}
        />

        <StatStrip
          savingAktual={savingAktual}
          savingProgress={savingProgress}
          savingTarget={savingTarget}
          totalIncome={totalIncome}
          totalPengeluaran={totalPengeluaran}
          transactionCount={transactionCount}
        />

        <DetailTabs
          labels={["Limit", "Kategori", "Pola"]}
          panels={[
            <LimitPanel
              items={categoryLimitItems}
              key="limit"
              totals={categoryLimitTotals}
            />,
            <DashboardCharts
              categoryData={categoryExpenseData}
              dailyData={dailyExpenseData}
              key="category"
              view="category"
            />,
            <DashboardCharts
              categoryData={categoryExpenseData}
              dailyData={dailyExpenseData}
              key="daily"
              view="daily"
            />,
          ]}
        />

        <MonthlyInsightsPanel
          insights={monthlyInsights}
          periodLabel={periodLabel}
        />
      </div>
    </main>
  );
}

function AllowanceHero({
  budgetBelanja,
  kategoriLabel,
  remainingDays,
  safeSpend,
  savingProgress,
  savingTarget,
  status,
  totalIncome,
  totalPengeluaran,
}: {
  budgetBelanja: number;
  kategoriLabel: string;
  remainingDays: number;
  safeSpend: DailySafeSpend;
  savingProgress: SavingProgress;
  savingTarget: number;
  status: FinancialStatus;
  totalIncome: number;
  totalPengeluaran: number;
}) {
  const statusClasses = {
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    blue: "bg-blue-50 text-blue-700 ring-blue-200",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    red: "bg-red-50 text-red-700 ring-red-200",
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
  }[status.tone];

  const base = Math.max(totalIncome, 0);
  const percentOf = (value: number) =>
    base > 0 ? Math.min(Math.max((value / base) * 100, 0), 100) : 0;
  const spentPercent = percentOf(totalPengeluaran);
  const savingPercent = percentOf(savingTarget);
  const restPercent = Math.max(100 - spentPercent - savingPercent, 0);
  const ringPercent = savingProgress.isTargetSet
    ? Math.min(Math.max(savingProgress.clampedPercent, 0), 100)
    : 0;
  const todayBalance =
    safeSpend.todayRemaining >= 0
      ? formatRupiah(safeSpend.todayRemaining)
      : `Lewat ${formatRupiah(Math.abs(safeSpend.todayRemaining))}`;

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6">
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--muted-foreground)]">
            Jatah aman hari ini
          </p>
          <p className="mt-2 break-words text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">
            {formatRupiah(safeSpend.dailyAllowance)}
            <span className="ml-2 align-middle text-base font-medium text-[var(--muted-foreground)]">
              / hari
            </span>
          </p>
          <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
            ({formatRupiah(totalIncome)} masuk &minus;{" "}
            {formatRupiah(savingTarget)} tabungan &minus;{" "}
            {formatRupiah(totalPengeluaran)} terpakai) &divide; {remainingDays}{" "}
            hari sisa
          </p>

          <div className="mt-5 flex h-2.5 overflow-hidden rounded-full bg-[var(--surface-subtle)]">
            <span
              className="block h-full bg-[var(--foreground)]"
              style={{ width: `${spentPercent}%` }}
            />
            <span
              className="block h-full bg-[var(--accent)]"
              style={{ width: `${savingPercent}%` }}
            />
            <span
              className="block h-full bg-[var(--border)]"
              style={{ width: `${restPercent}%` }}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[var(--muted-foreground)]">
            <LegendDot
              className="bg-[var(--foreground)]"
              label={`Terpakai ${formatRupiah(totalPengeluaran)}`}
            />
            <LegendDot
              className="bg-[var(--accent)]"
              label={`Tabungan ${formatRupiah(savingTarget)}`}
            />
            <LegendDot
              className="bg-[var(--border)]"
              label={`Belum dijatah ${formatRupiah(Math.max(budgetBelanja - totalPengeluaran, 0))}`}
            />
          </div>

          <p className="mt-4 text-xs text-[var(--muted-foreground)]">
            Budget belanja {formatRupiah(budgetBelanja)} &middot; kategori
            terbesar {kategoriLabel}
          </p>
        </div>

        <div className="flex items-center gap-4 md:flex-col md:items-end md:gap-4">
          <div
            className="grid size-28 shrink-0 place-items-center rounded-full"
            style={{
              background: `conic-gradient(var(--accent) 0 ${ringPercent}%, var(--border) ${ringPercent}% 100%)`,
            }}
          >
            <div className="grid size-[86px] place-items-center rounded-full bg-white text-center">
              <div>
                <p className="text-xl font-semibold tabular-nums">
                  {Math.round(ringPercent)}%
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                  tabungan
                </p>
              </div>
            </div>
          </div>
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ring-1 ${statusClasses}`}
          >
            {status.label}
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <MiniStat
          label="Pengeluaran hari ini"
          value={formatRupiah(safeSpend.todaySpent)}
        />
        <MiniStat label="Sisa hari ini" value={todayBalance} />
        <MiniStat
          label="Jatah aman besok"
          value={formatRupiah(safeSpend.nextDailyAllowance)}
        />
      </div>

      <p className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-3 text-sm leading-6 text-[var(--muted-foreground)]">
        {safeSpend.detail}
      </p>
    </section>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`size-2 shrink-0 rounded-sm ${className}`} />
      {label}
    </span>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] px-4 py-3">
      <p className="text-xs font-medium text-[var(--muted-foreground)]">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold tabular-nums">
        {value}
      </p>
    </div>
  );
}

function StatStrip({
  savingAktual,
  savingProgress,
  savingTarget,
  totalIncome,
  totalPengeluaran,
  transactionCount,
}: {
  savingAktual: number;
  savingProgress: SavingProgress;
  savingTarget: number;
  totalIncome: number;
  totalPengeluaran: number;
  transactionCount: number;
}) {
  const cells = [
    {
      label: "Pemasukan",
      note: "utama + tambahan",
      tone: "text-[var(--accent)]",
      value: totalIncome,
    },
    {
      label: "Pengeluaran",
      note: `${transactionCount} transaksi`,
      tone: "text-[var(--foreground)]",
      value: totalPengeluaran,
    },
    {
      label: "Sisa uang",
      note: "di luar tabungan",
      tone: savingAktual >= 0 ? "text-[var(--accent)]" : "text-red-700",
      value: savingAktual,
    },
    {
      label: "Target tabungan",
      note: savingProgress.isTargetSet
        ? `tercapai ${Math.round(savingProgress.clampedPercent)}%`
        : "belum diatur",
      tone: "text-[var(--foreground)]",
      value: savingTarget,
    },
  ];

  return (
    <section className="grid grid-cols-2 overflow-hidden rounded-2xl border border-[var(--border)] bg-white md:grid-cols-4">
      {cells.map((cell, index) => (
        <div
          className={`border-[var(--border)] p-4 sm:p-5 ${
            index % 2 === 1 ? "border-l" : ""
          } ${index >= 2 ? "border-t" : ""} md:border-t-0 md:border-l md:first:border-l-0`}
          key={cell.label}
        >
          <p className="text-xs font-medium text-[var(--muted-foreground)]">
            {cell.label}
          </p>
          <p
            className={`mt-1.5 break-words text-base font-semibold tabular-nums sm:text-lg md:text-xl ${cell.tone}`}
          >
            {formatRupiah(cell.value)}
          </p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            {cell.note}
          </p>
        </div>
      ))}
    </section>
  );
}
function LimitPanel({
  items,
  totals,
}: {
  items: CategoryLimitItem[];
  totals: { limitAmount: number; spentAmount: number };
}) {
  const hasLimits = items.some((item) => item.limitAmount > 0);
  const totalPercent =
    totals.limitAmount > 0
      ? Math.min((totals.spentAmount / totals.limitAmount) * 100, 100)
      : 0;

  if (!hasLimits) {
    return (
      <section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6">
        <h2 className="text-lg font-semibold">Limit per kategori</h2>
        <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
          Pantau kategori yang mendekati batas bulanan.
        </p>
        <div className="mt-5 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-subtle)] p-6 text-center">
          <p className="text-sm font-semibold">Limit kategori belum diatur.</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted-foreground)]">
            Isi limit kategori di halaman Budget supaya Gatra bisa menunjukkan
            kategori yang mulai bocor.
          </p>
          <Link
            className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100"
            href="/monthly-setup"
          >
            Atur limit
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Limit per kategori</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {formatRupiah(totals.spentAmount)} dari{" "}
            {formatRupiah(totals.limitAmount)} terpakai
          </p>
        </div>
        <Link
          className="flex h-11 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--foreground)] shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-100"
          href="/monthly-setup"
        >
          Atur limit
        </Link>
      </div>

      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[var(--surface-subtle)]">
        <span
          className="block h-full bg-[var(--primary)]"
          style={{ width: `${totalPercent}%` }}
        />
      </div>

      <div className="mt-4">
        {items.slice(0, 6).map((item) => (
          <LimitRow item={item} key={item.categoryId} />
        ))}
      </div>
    </section>
  );
}

function LimitRow({ item }: { item: CategoryLimitItem }) {
  const barTone =
    item.tone === "red"
      ? "bg-red-600"
      : item.tone === "amber"
        ? "bg-amber-500"
        : "bg-[var(--accent)]";
  const badgeTone = {
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    blue: "bg-blue-50 text-blue-700 ring-blue-200",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    red: "bg-red-50 text-red-700 ring-red-200",
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
  }[item.tone];
  const percent = Math.min(Math.max(item.percent, 0), 100);

  return (
    <div className="grid gap-x-4 gap-y-2 border-b border-[var(--border)] py-3.5 last:border-0 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_auto] sm:items-center">
      <div className="flex min-w-0 items-center gap-2">
        <p className="truncate text-sm font-semibold">{item.label}</p>
        {item.tone === "red" ? (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${badgeTone}`}
          >
            {item.statusLabel}
          </span>
        ) : null}
      </div>

      <div className="order-3 h-2 overflow-hidden rounded-full bg-[var(--surface-subtle)] sm:order-none">
        <span
          className={`block h-full rounded-full ${barTone}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      <p className="text-left text-sm font-semibold tabular-nums sm:text-right">
        {formatRupiah(item.spentAmount)}
        <span className="block text-xs font-medium text-[var(--muted-foreground)]">
          dari {formatRupiah(item.limitAmount)}
        </span>
      </p>
    </div>
  );
}

type DashboardTransaction = {
  amount: number | string;
  categories: {
    emoji: string | null;
    name: string;
  } | null;
  category_id: string | null;
  date: string;
};

type RawDashboardTransaction = {
  amount: number | string;
  category_id: string | null;
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

type DailySafeSpend = {
  dailyAllowance: number;
  detail: string;
  headline: string;
  label: string;
  nextDailyAllowance: number;
  remainingDaysAfterToday: number;
  todayRemaining: number;
  todaySpent: number;
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
    category_id: transaction.category_id,
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

function getDailySafeSpend({
  budgetBelanja,
  hasBudget,
  pengeluaranHariIni,
  remainingDays,
  sisaBudgetAman,
  totalPengeluaran,
  totalIncome,
}: {
  budgetBelanja: number;
  hasBudget: boolean;
  pengeluaranHariIni: number;
  remainingDays: number;
  sisaBudgetAman: number;
  totalPengeluaran: number;
  totalIncome: number;
}): DailySafeSpend {
  const safeRemainingDays = Math.max(remainingDays, 1);
  const remainingDaysAfterToday = Math.max(safeRemainingDays - 1, 0);
  const previousExpense = Math.max(totalPengeluaran - pengeluaranHariIni, 0);
  const budgetBeforeToday = budgetBelanja - previousExpense;
  const dailyAllowance = Math.max(budgetBeforeToday / safeRemainingDays, 0);
  const todayRemaining = dailyAllowance - pengeluaranHariIni;
  const nextDailyAllowance =
    safeRemainingDays > 1
      ? Math.max(sisaBudgetAman / (safeRemainingDays - 1), 0)
      : 0;

  if (!hasBudget) {
    return {
      dailyAllowance: 0,
      detail:
        "Isi pemasukan dan target tabungan dulu supaya Gatra bisa menghitung jatah aman harian.",
      headline: "Budget bulanan belum diatur.",
      label: "Atur budget",
      nextDailyAllowance: 0,
      remainingDaysAfterToday,
      todayRemaining: 0,
      todaySpent: pengeluaranHariIni,
      tone: "slate",
    };
  }

  if (totalIncome <= 0) {
    return {
      dailyAllowance: 0,
      detail:
        "Pemasukan bulan ini masih kosong, jadi belum ada ruang belanja aman yang bisa dihitung.",
      headline: "Pemasukan belum diisi.",
      label: "Belum aktif",
      nextDailyAllowance: 0,
      remainingDaysAfterToday,
      todayRemaining: -pengeluaranHariIni,
      todaySpent: pengeluaranHariIni,
      tone: "slate",
    };
  }

  if (budgetBelanja <= 0) {
    return {
      dailyAllowance: 0,
      detail:
        "Target tabungan sudah mengambil seluruh pemasukan. Turunkan target atau tambah pemasukan supaya ada ruang belanja.",
      headline: "Target tabungan terlalu ketat untuk bulan ini.",
      label: "Target berat",
      nextDailyAllowance: 0,
      remainingDaysAfterToday,
      todayRemaining: -pengeluaranHariIni,
      todaySpent: pengeluaranHariIni,
      tone: "red",
    };
  }

  if (sisaBudgetAman < 0) {
    return {
      dailyAllowance,
      detail: `Budget aman bulan ini sudah lewat ${formatRupiah(
        Math.abs(sisaBudgetAman),
      )}. Pengeluaran berikutnya makin mengurangi target tabungan.`,
      headline: "Budget aman bulan ini sudah lewat.",
      label: "Lewat batas",
      nextDailyAllowance,
      remainingDaysAfterToday,
      todayRemaining,
      todaySpent: pengeluaranHariIni,
      tone: "red",
    };
  }

  if (todayRemaining < 0) {
    return {
      dailyAllowance,
      detail: `Hari ini sudah lewat ${formatRupiah(
        Math.abs(todayRemaining),
      )}. Jatah aman besok turun jadi ${formatRupiah(nextDailyAllowance)}.`,
      headline: "Pengeluaran hari ini sudah melewati jatah aman.",
      label: "Lewat jatah",
      nextDailyAllowance,
      remainingDaysAfterToday,
      todayRemaining,
      todaySpent: pengeluaranHariIni,
      tone: "red",
    };
  }

  if (dailyAllowance < 50000) {
    return {
      dailyAllowance,
      detail:
        "Target masih bisa dikejar, tapi ruang belanja harian lagi tipis. Pakai jatah hari ini dengan hati-hati.",
      headline: "Jatah aman harian lagi ketat.",
      label: "Ketat",
      nextDailyAllowance,
      remainingDaysAfterToday,
      todayRemaining,
      todaySpent: pengeluaranHariIni,
      tone: "amber",
    };
  }

  if (pengeluaranHariIni > 0 && todayRemaining <= dailyAllowance * 0.25) {
    return {
      dailyAllowance,
      detail: `Masih aman ${formatRupiah(
        todayRemaining,
      )} untuk hari ini. Setelah itu jatah aman mulai ketarik.`,
      headline: "Jatah hari ini hampir habis.",
      label: "Waspada",
      nextDailyAllowance,
      remainingDaysAfterToday,
      todayRemaining,
      todaySpent: pengeluaranHariIni,
      tone: "amber",
    };
  }

  return {
    dailyAllowance,
    detail: `Masih aman ${formatRupiah(
      todayRemaining,
    )} untuk hari ini. Kalau tidak dipakai, ruang aman besok tetap longgar.`,
    headline: "Ruang belanja hari ini masih aman.",
    label: "Aman",
    nextDailyAllowance,
    remainingDaysAfterToday,
    todayRemaining,
    todaySpent: pengeluaranHariIni,
    tone: "green",
  };
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
