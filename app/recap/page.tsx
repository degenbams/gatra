import { AppNav } from "@/components/app-nav";
import {
  ExportRecapPdfButton,
  type RecapPdfData,
} from "@/components/export-recap-pdf-button";
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
  monthOptions,
} from "@/lib/date";
import { formatDateID, formatPercent, formatRupiah } from "@/lib/format";
import { buildMonthlyInsights } from "@/lib/monthly-insights";
import { createClient } from "@/lib/supabase/server";
import {
  ArrowLeft,
  CalendarDays,
  Filter,
  HandCoins,
  ListChecks,
  PiggyBank,
  ReceiptText,
  ShieldCheck,
  Target,
  TrendingDown,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

type RecapPageProps = {
  searchParams: Promise<{
    month?: string;
    year?: string;
  }>;
};

type CategoryInfo = {
  emoji: string | null;
  name: string;
};

type RecapTransaction = {
  amount: number | string;
  categories: CategoryInfo | null;
  category_id: string | null;
  date: string;
  id: string;
  note: string | null;
};

type RawRecapTransaction = Omit<RecapTransaction, "categories"> & {
  categories: CategoryInfo | CategoryInfo[] | null;
};

type RecapIncomeEntry = {
  amount: number | string;
  date: string;
  id: string;
  note: string | null;
  source: string;
};

const dailyTrackingCategories = [
  "Food",
  "Drink/Coffee",
  "Smoke",
  "Jajan",
  "Health & Wellness",
  "Transport",
];

const weeklyTrackingCategories = [
  ...dailyTrackingCategories,
  "Dating",
  "Bills & Utilities",
];

export default async function RecapPage({ searchParams }: RecapPageProps) {
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

  const [
    { data: profile },
    { data: budget },
    { data: incomeEntries },
    { data: transactions },
    { data: categories },
    { data: categoryLimits },
  ] = await Promise.all([
      supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .maybeSingle(),
    supabase
      .from("monthly_budgets")
      .select("income, saving_target")
      .eq("user_id", user.id)
      .eq("month", selectedMonth)
      .eq("year", selectedYear)
      .maybeSingle(),
    supabase
      .from("income_entries")
      .select("id, date, amount, source, note")
      .eq("user_id", user.id)
      .gte("date", start)
      .lt("date", end)
      .order("date", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("transactions")
      .select("id, date, amount, note, category_id, categories(name, emoji)")
      .eq("user_id", user.id)
      .gte("date", start)
      .lt("date", end)
      .order("date", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("categories")
      .select("id, name, emoji, tracking_type")
      .order("tracking_type")
      .order("name"),
    supabase
      .from("category_limits")
      .select("category_id, limit_amount")
      .eq("user_id", user.id)
      .eq("month", selectedMonth)
      .eq("year", selectedYear),
  ]);

  const rows = ((transactions ?? []) as RawRecapTransaction[]).map(
    normalizeRecapTransaction,
  );
  const incomeRows = (incomeEntries ?? []) as RecapIncomeEntry[];
  const pemasukanUtama = toFiniteNumber(budget?.income);
  const pemasukanTambahan = incomeRows.reduce(
    (total, entry) => total + toFiniteNumber(entry.amount),
    0,
  );
  const totalIncome = pemasukanUtama + pemasukanTambahan;
  const savingTarget = toFiniteNumber(budget?.saving_target);
  const totalPengeluaran = rows.reduce(
    (total, transaction) => total + toFiniteNumber(transaction.amount),
    0,
  );
  const savingAktual = totalIncome - totalPengeluaran;
  const selisihTargetTabungan = savingAktual - savingTarget;
  const savingRate =
    totalIncome > 0 ? toFiniteNumber((savingAktual / totalIncome) * 100) : 0;
  const budgetBelanja = totalIncome - savingTarget;
  const sisaBudgetAman = budgetBelanja - totalPengeluaran;
  const statusKeuangan = getFinancialStatus(totalPengeluaran, budgetBelanja);
  const kategoriTerbesar = getTopCategory(rows);
  const categoryBreakdown = getCategoryBreakdown(rows, totalPengeluaran);
  const categoryLimitItems = buildCategoryLimitItems({
    categories: categories ?? [],
    limits: categoryLimits ?? [],
    transactions: rows,
  });
  const categoryLimitTotals = getCategoryLimitTotals(categoryLimitItems);
  const monthlyInsights = buildMonthlyInsights({
    budgetBelanja,
    categoryBreakdown,
    categoryLimitItems,
    hasBudget: Boolean(budget),
    savingAktual,
    savingTarget,
    sisaBudgetAman,
    totalIncome,
    totalPengeluaran,
    transactionCount: rows.length,
  });
  const dailyTracking = getDailyTracking(rows);
  const weeklyTracking = getWeeklyTracking(rows);
  const userLabel =
    profile?.display_name ||
    user.user_metadata?.display_name ||
    user.email ||
    "Pengguna Gatra";
  const periodLabel = `${getMonthLabel(selectedMonth)} ${selectedYear}`;
  const pdfData = buildPdfData({
    budgetBelanja,
    categoryBreakdown,
    dailyTracking,
    incomeRows,
    kategoriTerbesar,
    periodLabel,
    pemasukanTambahan,
    pemasukanUtama,
    rows,
    savingAktual,
    savingRate,
    savingTarget,
    selectedMonth,
    selectedYear,
    selisihTargetTabungan,
    sisaBudgetAman,
    statusKeuanganLabel: statusKeuangan.label,
    totalIncome,
    totalPengeluaran,
    userLabel,
    weeklyTracking,
  });

  return (
    <main className="min-h-dvh bg-[var(--surface-subtle)] px-4 py-6 text-[var(--foreground)] sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--primary)]">
                Rekap Bulanan
              </p>
              <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">
                Rekap {getMonthLabel(selectedMonth)} {selectedYear}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
                Ringkasan budget, transaksi, tracking kategori, dan status
                keuangan untuk bulan pilihan.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <ExportRecapPdfButton data={pdfData} />
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

        <AppNav active="recap" />

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

        {!budget || rows.length === 0 ? (
          <section className="grid gap-4 lg:grid-cols-2">
            {!budget ? (
              <EmptyNotice
                actionHref="/monthly-setup"
                actionLabel="Atur Budget Bulanan"
                title="Budget bulan ini belum ada"
                description="Isi pemasukan dan target tabungan dulu supaya rekap bisa menghitung saving rate dan sisa budget aman."
              />
            ) : null}
            {rows.length === 0 ? (
              <EmptyNotice
                actionHref="/transactions/new"
                actionLabel="Tambah Transaksi"
                title="Belum ada transaksi"
                description="Catat pengeluaran bulan ini supaya breakdown kategori dan tracking harian/mingguan mulai terisi."
              />
            ) : null}
          </section>
        ) : null}

        <section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6">
          <SectionHeader
            title="Pemasukan"
            description="Gabungan pemasukan utama bulanan dan pemasukan tambahan pada periode ini."
          />
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <SummaryCard
              icon={<WalletCards className="size-5" />}
              label="Pemasukan utama"
              tone="blue"
              value={formatRupiah(pemasukanUtama)}
            />
            <SummaryCard
              icon={<HandCoins className="size-5" />}
              label="Pemasukan tambahan"
              tone="green"
              value={formatRupiah(pemasukanTambahan)}
            />
            <SummaryCard
              icon={<WalletCards className="size-5" />}
              label="Total pemasukan"
              tone="slate"
              value={formatRupiah(totalIncome)}
            />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={<WalletCards className="size-5" />}
            label="Total pemasukan"
            tone="blue"
            value={formatRupiah(totalIncome)}
          />
          <SummaryCard
            icon={<TrendingDown className="size-5" />}
            label="Total pengeluaran"
            tone="red"
            value={formatRupiah(totalPengeluaran)}
          />
          <SummaryCard
            icon={<PiggyBank className="size-5" />}
            label="Sisa Uang Saat Ini"
            tone={savingAktual >= savingTarget ? "green" : "amber"}
            value={formatRupiah(savingAktual)}
          />
          <SummaryCard
            icon={<Target className="size-5" />}
            label="Target tabungan"
            tone="slate"
            value={formatRupiah(savingTarget)}
          />
          <SummaryCard
            icon={<Target className="size-5" />}
            label="Selisih dari Target Tabungan"
            tone={selisihTargetTabungan >= 0 ? "green" : "red"}
            value={formatTargetDifference(selisihTargetTabungan)}
          />
          <SummaryCard
            icon={<PiggyBank className="size-5" />}
            label="Rasio tabungan"
            tone={savingRate >= 20 ? "green" : "amber"}
            value={formatPercent(savingRate)}
          />
          <SummaryCard
            icon={<WalletCards className="size-5" />}
            label="Budget belanja"
            tone="blue"
            value={formatRupiah(budgetBelanja)}
          />
          <SummaryCard
            icon={<ShieldCheck className="size-5" />}
            label="Sisa budget aman"
            tone={sisaBudgetAman >= 0 ? "green" : "red"}
            value={formatRupiah(sisaBudgetAman)}
          />
          <SummaryCard
            icon={<ShieldCheck className="size-5" />}
            label="Status keuangan"
            tone={statusKeuangan.tone}
            value={statusKeuangan.label}
          />
          <SummaryCard
            icon={<ReceiptText className="size-5" />}
            label="Jumlah transaksi"
            tone="green"
            value={String(rows.length)}
          />
          <SummaryCard
            icon={<ListChecks className="size-5" />}
            label="Kategori terbesar"
            tone="slate"
            value={kategoriTerbesar.label}
          />
          <SummaryCard
            icon={<CalendarDays className="size-5" />}
            label="Total kategori terbesar"
            tone="slate"
            value={formatRupiah(kategoriTerbesar.total)}
          />
        </section>

        <MonthlyInsightsPanel
          insights={monthlyInsights}
          periodLabel={periodLabel}
        />

        <section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6">
          <SectionHeader
            title="Breakdown pengeluaran per kategori"
            description="Urutan kategori berdasarkan total pengeluaran terbesar."
          />
          {categoryBreakdown.length === 0 ? (
            <InlineEmpty label="Belum ada breakdown kategori." />
          ) : (
            <div className="mt-6 space-y-4">
              {categoryBreakdown.map((item) => (
                <div key={item.name}>
                  <div className="flex items-center justify-between gap-4">
                    <p className="min-w-0 truncate text-sm font-semibold">
                      {item.emoji ? `${item.emoji} ` : ""}
                      {item.name}
                    </p>
                    <p className="shrink-0 text-sm font-semibold tabular-nums">
                      {formatRupiah(item.total)}
                    </p>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-[var(--primary)]"
                      style={{ width: `${Math.min(item.percent, 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    {formatPercent(item.percent)} dari total pengeluaran
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <CategoryLimitRecap
          items={categoryLimitItems}
          totals={categoryLimitTotals}
        />

        <section className="grid gap-6 xl:grid-cols-2">
          <TrackingCard
            description="Total per kategori pada tanggal transaksi."
            entries={dailyTracking}
            title="Daily tracking"
            type="daily"
          />
          <TrackingCard
            description="Total per kategori per minggu dalam bulan pilihan."
            entries={weeklyTracking}
            title="Weekly tracking"
            type="weekly"
          />
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6">
          <SectionHeader
            title="Daftar pemasukan tambahan"
            description="Pemasukan sampingan yang ikut menambah total pemasukan bulan ini."
          />
          {incomeRows.length === 0 ? (
            <InlineEmpty label="Belum ada pemasukan tambahan untuk periode ini." />
          ) : (
            <div className="mt-6 divide-y divide-[var(--border)]">
              {[...incomeRows].reverse().map((entry) => (
                <article
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                  key={entry.id}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[var(--primary)] shadow-sm">
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
                  <p className="text-base font-semibold tabular-nums text-emerald-700">
                    {formatRupiah(entry.amount)}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6">
          <SectionHeader
            title="Daftar transaksi bulan tersebut"
            description="Detail transaksi yang menjadi dasar rekap ini."
          />
          {rows.length === 0 ? (
            <InlineEmpty label="Belum ada transaksi untuk periode ini." />
          ) : (
            <div className="mt-6 divide-y divide-[var(--border)]">
              {[...rows].reverse().map((transaction) => (
                <article
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                  key={transaction.id}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-lg shadow-sm">
                        {transaction.categories?.emoji ?? "-"}
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
                  <p className="text-base font-semibold tabular-nums text-red-700">
                    {formatRupiah(transaction.amount)}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function SummaryCard({
  icon,
  label,
  tone,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  tone: "amber" | "blue" | "green" | "red" | "slate";
  value: string;
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
      <p className="mt-1 break-words text-2xl font-semibold">{value}</p>
    </div>
  );
}

function SectionHeader({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
        {description}
      </p>
    </div>
  );
}

function EmptyNotice({
  actionHref,
  actionLabel,
  description,
  title,
}: {
  actionHref: string;
  actionLabel: string;
  description: string;
  title: string;
}) {
  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 shadow-[var(--shadow-soft)] sm:p-6">
      <h2 className="text-lg font-semibold text-blue-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-blue-800">{description}</p>
      <Link
        className="mt-4 flex h-11 w-full items-center justify-center rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 sm:w-fit"
        href={actionHref}
      >
        {actionLabel}
      </Link>
    </div>
  );
}

function InlineEmpty({ label }: { label: string }) {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-[var(--border)] bg-slate-50 p-6 text-center text-sm text-[var(--muted-foreground)]">
      {label}
    </div>
  );
}

function TrackingCard({
  description,
  entries,
  title,
  type,
}: {
  description: string;
  entries: TrackingEntry[];
  title: string;
  type: "daily" | "weekly";
}) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6">
      <SectionHeader description={description} title={title} />
      <div className="mt-6 grid gap-4">
        {entries.map((entry) => (
          <div
            className="rounded-2xl border border-[var(--border)] bg-slate-50 p-4"
            key={entry.name}
          >
            <div className="flex items-center justify-between gap-4">
              <h3 className="min-w-0 truncate text-sm font-semibold">
                {entry.emoji ? `${entry.emoji} ` : ""}
                {entry.name}
              </h3>
              <p className="shrink-0 text-sm font-semibold tabular-nums">
                {formatRupiah(entry.total)}
              </p>
            </div>

            {entry.items.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--muted-foreground)]">
                Belum ada transaksi.
              </p>
            ) : (
              <div className="mt-3 grid gap-2">
                {entry.items.map((item) => (
                  <div
                    className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-sm shadow-sm"
                    key={item.label}
                  >
                    <span className="min-w-0 truncate">
                      {type === "daily" ? formatDateID(item.label) : item.label}
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums">
                      {formatRupiah(item.total)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function CategoryLimitRecap({
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

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6">
      <SectionHeader
        title="Tracking limit kategori"
        description="Membandingkan limit bulanan per kategori dengan pengeluaran aktual."
      />

      {hasLimits ? (
        <>
          <div className="mt-6 rounded-2xl bg-slate-50 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--muted-foreground)]">
                  Total limit terpakai
                </p>
                <p className="mt-1 text-2xl font-semibold">
                  {formatRupiah(totals.spentAmount)}
                </p>
              </div>
              <p className="text-sm font-semibold text-[var(--muted-foreground)]">
                dari {formatRupiah(totals.limitAmount)}
              </p>
            </div>
            <div className="mt-4 h-2 rounded-full bg-white">
              <div
                className="h-2 rounded-full bg-[var(--primary)]"
                style={{ width: `${totalPercent}%` }}
              />
            </div>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {items.map((item) => (
              <CategoryLimitRecapRow item={item} key={item.categoryId} />
            ))}
          </div>
        </>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-[var(--border)] bg-slate-50 p-6 text-center">
          <p className="text-sm font-semibold">
            Limit kategori belum diatur untuk periode ini.
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted-foreground)]">
            Isi limit kategori dari halaman Budget supaya rekap bisa menunjukkan
            kategori yang mendekati batas.
          </p>
          <Link
            className="mx-auto mt-5 flex h-11 w-full max-w-xs items-center justify-center rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100"
            href="/monthly-setup"
          >
            Atur Limit Kategori
          </Link>
        </div>
      )}
    </section>
  );
}

function CategoryLimitRecapRow({ item }: { item: CategoryLimitItem }) {
  const toneClasses = {
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    blue: "bg-blue-50 text-blue-700 ring-blue-200",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    red: "bg-red-50 text-red-700 ring-red-200",
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
  }[item.tone];

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{item.label}</p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            {formatRupiah(item.spentAmount)} dari {formatRupiah(item.limitAmount)}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${toneClasses}`}
        >
          {item.statusLabel}
        </span>
      </div>
      <div className="mt-4 h-2 rounded-full bg-slate-100">
        <div
          className={`h-2 rounded-full ${item.tone === "red" ? "bg-red-500" : "bg-[var(--accent)]"}`}
          style={{ width: `${Math.min(item.percent, 100)}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-[var(--muted-foreground)]">
        Sisa {formatRupiah(Math.max(item.remainingAmount, 0))}
      </p>
    </div>
  );
}

type TrackingEntry = {
  emoji: string | null;
  items: {
    label: string;
    total: number;
  }[];
  name: string;
  total: number;
};

function normalizeRecapTransaction(
  transaction: RawRecapTransaction,
): RecapTransaction {
  return {
    ...transaction,
    categories: Array.isArray(transaction.categories)
      ? transaction.categories[0] ?? null
      : transaction.categories,
  };
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

function getFinancialStatus(totalPengeluaran: number, budgetBelanja: number): {
  label: string;
  tone: "amber" | "green" | "red" | "slate";
} {
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

function getTopCategory(transactions: RecapTransaction[]) {
  const breakdown = getCategoryBreakdown(transactions, 0);
  const topCategory = breakdown[0];

  return {
    emoji: topCategory?.emoji ?? null,
    label: topCategory
      ? `${topCategory.emoji ? `${topCategory.emoji} ` : ""}${topCategory.name}`
      : "Belum ada",
    name: topCategory?.name ?? "Belum ada",
    total: topCategory?.total ?? 0,
  };
}

function getCategoryBreakdown(
  transactions: RecapTransaction[],
  totalPengeluaran: number,
) {
  const categoryTotals = new Map<
    string,
    { emoji: string | null; name: string; total: number }
  >();

  transactions.forEach((transaction) => {
    const name = transaction.categories?.name ?? "Tanpa kategori";
    const current = categoryTotals.get(name);

    categoryTotals.set(name, {
      emoji: transaction.categories?.emoji ?? current?.emoji ?? null,
      name,
      total: (current?.total ?? 0) + toFiniteNumber(transaction.amount),
    });
  });

  return Array.from(categoryTotals.values())
    .map((item) => ({
      ...item,
      percent: totalPengeluaran > 0 ? (item.total / totalPengeluaran) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

function getDailyTracking(transactions: RecapTransaction[]): TrackingEntry[] {
  return buildTracking(transactions, dailyTrackingCategories, (transaction) =>
    transaction.date,
  );
}

function getWeeklyTracking(transactions: RecapTransaction[]): TrackingEntry[] {
  return buildTracking(transactions, weeklyTrackingCategories, (transaction) =>
    getWeekLabel(transaction.date),
  );
}

function buildTracking(
  transactions: RecapTransaction[],
  categoryNames: string[],
  getLabel: (transaction: RecapTransaction) => string,
): TrackingEntry[] {
  return categoryNames.map((name) => {
    const categoryTransactions = transactions.filter(
      (transaction) => transaction.categories?.name === name,
    );
    const totals = new Map<string, number>();

    categoryTransactions.forEach((transaction) => {
      const label = getLabel(transaction);
      totals.set(
        label,
        (totals.get(label) ?? 0) + toFiniteNumber(transaction.amount),
      );
    });

    const firstCategory = categoryTransactions[0]?.categories ?? null;
    const items = Array.from(totals.entries()).map(([label, total]) => ({
      label,
      total,
    }));

    return {
      emoji: firstCategory?.emoji ?? null,
      items,
      name,
      total: items.reduce((sum, item) => sum + item.total, 0),
    };
  });
}

function getWeekLabel(date: string) {
  const day = Number(date.slice(8, 10));
  const week = Math.ceil(day / 7);
  const startDay = (week - 1) * 7 + 1;
  const endDay = Math.min(week * 7, 31);

  return `Minggu ${week} (${startDay}-${endDay})`;
}

function buildPdfData({
  budgetBelanja,
  categoryBreakdown,
  dailyTracking,
  incomeRows,
  kategoriTerbesar,
  periodLabel,
  pemasukanTambahan,
  pemasukanUtama,
  rows,
  savingAktual,
  savingRate,
  savingTarget,
  selectedMonth,
  selectedYear,
  selisihTargetTabungan,
  sisaBudgetAman,
  statusKeuanganLabel,
  totalIncome,
  totalPengeluaran,
  userLabel,
  weeklyTracking,
}: {
  budgetBelanja: number;
  categoryBreakdown: ReturnType<typeof getCategoryBreakdown>;
  dailyTracking: TrackingEntry[];
  incomeRows: RecapIncomeEntry[];
  kategoriTerbesar: ReturnType<typeof getTopCategory>;
  periodLabel: string;
  pemasukanTambahan: number;
  pemasukanUtama: number;
  rows: RecapTransaction[];
  savingAktual: number;
  savingRate: number;
  savingTarget: number;
  selectedMonth: number;
  selectedYear: number;
  selisihTargetTabungan: number;
  sisaBudgetAman: number;
  statusKeuanganLabel: string;
  totalIncome: number;
  totalPengeluaran: number;
  userLabel: string;
  weeklyTracking: TrackingEntry[];
}): RecapPdfData {
  const monthSlug = getMonthLabel(selectedMonth).toLowerCase();

  return {
    appName: "Gatra",
    tagline: "Rekap keuanganmu, tersusun jelas.",
    userLabel,
    periodLabel,
    exportDate: formatDateID(getJakartaTodayISO()),
    fileName: `gatra-rekap-${monthSlug}-${selectedYear}.pdf`,
    summary: [
      { label: "Pemasukan utama", value: formatRupiah(pemasukanUtama) },
      {
        label: "Pemasukan tambahan",
        value: formatRupiah(pemasukanTambahan),
      },
      { label: "Total pemasukan", value: formatRupiah(totalIncome) },
      { label: "Total pengeluaran", value: formatRupiah(totalPengeluaran) },
      { label: "Sisa Uang Saat Ini", value: formatRupiah(savingAktual) },
      { label: "Target tabungan", value: formatRupiah(savingTarget) },
      {
        label: "Selisih dari Target Tabungan",
        value: formatTargetDifference(selisihTargetTabungan),
      },
      { label: "Rasio tabungan", value: formatPercent(savingRate) },
      { label: "Budget belanja", value: formatRupiah(budgetBelanja) },
      { label: "Sisa budget aman", value: formatRupiah(sisaBudgetAman) },
      { label: "Status keuangan", value: statusKeuanganLabel },
      { label: "Jumlah transaksi", value: String(rows.length) },
      {
        label: "Kategori pengeluaran terbesar",
        value: getPdfCategoryName(kategoriTerbesar.name),
      },
    ],
    categoryBreakdown: categoryBreakdown.map((item) => ({
      category: getPdfCategoryName(item.name),
      percent: formatPercent(item.percent),
      total: formatRupiah(item.total),
    })),
    incomeEntries: incomeRows.map((entry) => ({
      amount: formatRupiah(entry.amount),
      date: formatDateID(entry.date),
      note: entry.note || "-",
      source: stripEmoji(entry.source) || "Pemasukan tambahan",
    })),
    dailyTracking: dailyTracking.map((entry) => ({
      category: getPdfCategoryName(entry.name),
      rows: entry.items.map((item) => ({
        period: formatDateID(item.label),
        total: formatRupiah(item.total),
      })),
      total: formatRupiah(entry.total),
    })),
    weeklyTracking: weeklyTracking.map((entry) => ({
      category: getPdfCategoryName(entry.name),
      rows: entry.items.map((item) => ({
        period: item.label,
        total: formatRupiah(item.total),
      })),
      total: formatRupiah(entry.total),
    })),
    transactions: rows.map((transaction) => ({
      amount: formatRupiah(transaction.amount),
      category: getPdfCategoryName(
        transaction.categories?.name ?? "Tanpa kategori",
      ),
      date: formatDateID(transaction.date),
      note: transaction.note || "-",
    })),
  };
}

function getPdfCategoryName(name: string | null | undefined) {
  const cleanName = stripEmoji(name ?? "Tanpa kategori");

  return cleanName || "Tanpa kategori";
}

function stripEmoji(value: string) {
  return value
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]\s*/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatTargetDifference(value: number) {
  const difference = toFiniteNumber(value);

  if (difference > 0) {
    return `Lebih ${formatRupiah(difference)} dari target`;
  }

  if (difference < 0) {
    return `Kurang ${formatRupiah(Math.abs(difference))} dari target`;
  }

  return "Sesuai target";
}

function toFiniteNumber(value: number | string | null | undefined) {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}
