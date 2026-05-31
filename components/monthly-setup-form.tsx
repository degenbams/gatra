"use client";

import { getDaysInMonth, getMonthLabel, monthOptions } from "@/lib/date";
import {
  formatNumberInput,
  formatPercent,
  formatRupiah,
  parseNumberInput,
} from "@/lib/format";
import { createClient } from "@/lib/supabase/browser";
import {
  ArrowLeft,
  Calculator,
  CalendarDays,
  CheckCircle2,
  ListChecks,
  PiggyBank,
  Save,
  Target,
  Trash2,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";

type MonthlySetupFormProps = {
  categories: CategoryOption[];
  initialCategoryLimits: CategoryLimitInitial[];
  initialBudget: {
    income: number | string;
    saving_target: number | string;
  } | null;
  initialMonth: number;
  initialYear: number;
};

type CategoryOption = {
  emoji: string | null;
  id: string;
  name: string;
  tracking_type: string;
};

type CategoryLimitInitial = {
  category_id: string | null;
  limit_amount: number | string | null;
};

type MessageTone = "error" | "success" | "info";
type BudgetPreviewTone = "amber" | "blue" | "green" | "red" | "slate";

type BudgetPreview = {
  budgetBelanja: number;
  dailyAllowance: number;
  daysInMonth: number;
  detail: string;
  hasIncome: boolean;
  headline: string;
  label: string;
  recommendedSaving: number;
  savingRate: number;
  tone: BudgetPreviewTone;
};

type CategoryLimitSummary = {
  detail: string;
  gap: number;
  hasAnyLimit: boolean;
  label: string;
  tone: BudgetPreviewTone;
  totalLimit: number;
};

const targetPresets = [10, 20, 30];
const trackingTypeLabels: Record<string, string> = {
  daily: "Harian",
  monthly: "Bulanan",
  weekly: "Mingguan",
};

export function MonthlySetupForm({
  categories,
  initialCategoryLimits,
  initialBudget,
  initialMonth,
  initialYear,
}: MonthlySetupFormProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [income, setIncome] = useState(formatNumberInput(initialBudget?.income));
  const [savingTarget, setSavingTarget] = useState(
    formatNumberInput(initialBudget?.saving_target),
  );
  const [categoryLimitValues, setCategoryLimitValues] = useState(
    getInitialCategoryLimitValues(categories, initialCategoryLimits),
  );
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<MessageTone>("info");
  const [hasExistingBudget, setHasExistingBudget] = useState(
    Boolean(initialBudget),
  );
  const [statusMessage, setStatusMessage] = useState(
    initialBudget
      ? "Budget untuk bulan ini sudah tersimpan"
      : "Belum ada budget untuk bulan ini",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingBudget, setIsLoadingBudget] = useState(false);
  const budgetPreview = useMemo(
    () =>
      getBudgetPreview({
        daysInMonth: getDaysInMonth(month, year),
        income: parseNumberInput(income),
        savingTarget: parseNumberInput(savingTarget),
      }),
    [income, month, savingTarget, year],
  );
  const categoryLimitSummary = useMemo(
    () =>
      getCategoryLimitSummary({
        budgetBelanja: budgetPreview.budgetBelanja,
        values: categoryLimitValues,
      }),
    [budgetPreview.budgetBelanja, categoryLimitValues],
  );

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 11 }, (_, index) => currentYear - 5 + index);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadBudget() {
      setMessage("");
      setIsLoadingBudget(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!isMounted) {
        return;
      }

      if (userError || !user) {
        setMessageTone("error");
        setMessage("Sesi login tidak ditemukan. Silakan login ulang.");
        setIsLoadingBudget(false);
        return;
      }

      const [
        { data: budgetData, error: budgetError },
        { data: limitData, error: limitError },
      ] = await Promise.all([
        supabase
          .from("monthly_budgets")
          .select("income, saving_target")
          .eq("user_id", user.id)
          .eq("month", month)
          .eq("year", year)
          .maybeSingle(),
        supabase
          .from("category_limits")
          .select("category_id, limit_amount")
          .eq("user_id", user.id)
          .eq("month", month)
          .eq("year", year),
      ]);

      if (!isMounted) {
        return;
      }

      setIsLoadingBudget(false);

      if (budgetError) {
        setMessageTone("error");
        setMessage("Budget bulan ini belum bisa dimuat. Coba lagi sebentar.");
        return;
      }

      setCategoryLimitValues(
        getInitialCategoryLimitValues(
          categories,
          limitError ? [] : ((limitData ?? []) as CategoryLimitInitial[]),
        ),
      );

      if (budgetData) {
        setIncome(formatNumberInput(budgetData.income));
        setSavingTarget(formatNumberInput(budgetData.saving_target));
        setHasExistingBudget(true);
        setStatusMessage("Budget untuk bulan ini sudah tersimpan");
        setMessageTone("info");
        setMessage(
          limitError
            ? `Data ${getMonthLabel(month)} ${year} siap diedit. Limit kategori belum aktif di database.`
            : `Data ${getMonthLabel(month)} ${year} siap diedit.`,
        );
        return;
      }

      setIncome("");
      setSavingTarget("");
      setHasExistingBudget(false);
      setStatusMessage("Belum ada budget untuk bulan ini");
      setMessageTone("info");
      setMessage(
        limitError
          ? `Belum ada budget untuk ${getMonthLabel(month)} ${year}. Limit kategori belum aktif di database.`
          : `Belum ada budget untuk ${getMonthLabel(month)} ${year}.`,
      );
    }

    loadBudget();

    return () => {
      isMounted = false;
    };
  }, [categories, month, year, supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const monthNumber = Number(month);
    const yearNumber = Number(year);
    const incomeNumber = parseNumberInput(income);
    const savingTargetNumber = parseNumberInput(savingTarget);

    if (!Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > 12) {
      setMessageTone("error");
      setMessage("Bulan wajib dipilih dari Januari sampai Desember.");
      return;
    }

    if (!Number.isInteger(yearNumber) || yearNumber < 2000 || yearNumber > 2100) {
      setMessageTone("error");
      setMessage("Tahun wajib valid.");
      return;
    }

    if (!Number.isFinite(incomeNumber) || incomeNumber < 0) {
      setMessageTone("error");
      setMessage("Total pemasukan wajib angka minimal 0.");
      return;
    }

    if (!Number.isFinite(savingTargetNumber) || savingTargetNumber < 0) {
      setMessageTone("error");
      setMessage("Target tabungan wajib angka minimal 0.");
      return;
    }

    setIsSaving(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setIsSaving(false);
      setMessageTone("error");
      setMessage("Sesi login tidak ditemukan. Silakan login ulang.");
      return;
    }

    const { error } = await supabase.from("monthly_budgets").upsert(
      {
        income: incomeNumber,
        month: monthNumber,
        saving_target: savingTargetNumber,
        user_id: user.id,
        year: yearNumber,
      },
      { onConflict: "user_id,month,year" },
    );

    if (error) {
      setIsSaving(false);
      setMessageTone("error");
      setMessage("Budget belum berhasil disimpan. Coba lagi sebentar.");
      return;
    }

    const limitRows = categories
      .map((category) => ({
        category_id: category.id,
        limit_amount: parseLimitInput(categoryLimitValues[category.id]),
        month: monthNumber,
        user_id: user.id,
        year: yearNumber,
      }))
      .filter((row) => row.limit_amount > 0);
    const { error: deleteLimitError } = await supabase
      .from("category_limits")
      .delete()
      .eq("user_id", user.id)
      .eq("month", monthNumber)
      .eq("year", yearNumber);

    if (deleteLimitError) {
      setIsSaving(false);
      setMessageTone("error");
      setMessage(
        "Budget tersimpan, tapi limit kategori belum berhasil diperbarui. Pastikan schema category_limits sudah dibuat.",
      );
      return;
    }

    if (limitRows.length > 0) {
      const { error: insertLimitError } = await supabase
        .from("category_limits")
        .insert(limitRows);

      if (insertLimitError) {
        setIsSaving(false);
        setMessageTone("error");
        setMessage(
          "Budget tersimpan, tapi limit kategori belum berhasil disimpan. Coba lagi sebentar.",
        );
        return;
      }
    }

    setIsSaving(false);
    setMessageTone("success");
    setMessage(
      hasExistingBudget
        ? "Budget dan limit kategori berhasil diperbarui."
        : "Budget dan limit kategori berhasil disimpan.",
    );
    setHasExistingBudget(true);
    setStatusMessage("Budget untuk bulan ini sudah tersimpan");
    router.refresh();
  }

  function handleUsePreset(percent: number) {
    const incomeNumber = parseNumberInput(income);

    if (!Number.isFinite(incomeNumber) || incomeNumber <= 0) {
      setMessageTone("info");
      setMessage("Isi pemasukan bulanan dulu supaya target cepat bisa dihitung.");
      return;
    }

    setSavingTarget(formatNumberInput(Math.round((incomeNumber * percent) / 100)));
    setMessage("");
  }

  function handleCategoryLimitChange(categoryId: string, value: string) {
    setCategoryLimitValues((current) => ({
      ...current,
      [categoryId]: formatNumberInput(value),
    }));
  }

  async function handleDeleteBudget() {
    const confirmed = window.confirm(
      "Yakin ingin menghapus budget bulan ini? Transaksi tidak akan ikut terhapus.",
    );

    if (!confirmed) {
      return;
    }

    setMessage("");
    setIsDeleting(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setIsDeleting(false);
      setMessageTone("error");
      setMessage("Sesi login tidak ditemukan. Silakan login ulang.");
      return;
    }

    const { error } = await supabase
      .from("monthly_budgets")
      .delete()
      .eq("user_id", user.id)
      .eq("month", month)
      .eq("year", year);

    setIsDeleting(false);

    if (error) {
      setMessageTone("error");
      setMessage("Budget bulan ini belum berhasil dihapus. Coba lagi sebentar.");
      return;
    }

    await supabase
      .from("category_limits")
      .delete()
      .eq("user_id", user.id)
      .eq("month", month)
      .eq("year", year);

    setIncome("");
    setSavingTarget("");
    setCategoryLimitValues(getInitialCategoryLimitValues(categories, []));
    setHasExistingBudget(false);
    setStatusMessage("Belum ada budget untuk bulan ini");
    setMessageTone("success");
    setMessage("Budget bulan ini berhasil dihapus. Transaksi tetap aman.");
    router.refresh();
  }

  const messageClass = {
    error: "border-red-200 bg-red-50 text-red-700",
    info: "border-blue-200 bg-blue-50 text-blue-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  }[messageTone];
  const statusClass = hasExistingBudget
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-blue-200 bg-blue-50 text-blue-700";
  const showExistingBudgetActions = hasExistingBudget && !isLoadingBudget;

  return (
    <form
      className="grid gap-6 lg:grid-cols-[1fr_360px]"
      onSubmit={handleSubmit}
    >
      <section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[var(--primary)]">
            <CalendarDays className="size-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary)]">
              Langkah 1
            </p>
            <h2 className="mt-1 text-lg font-semibold">Pilih periode</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
              Budget disimpan per bulan supaya laporan dan jatah aman tidak
              campur antar periode.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium">Bulan</span>
            <select
              className="mt-2 h-12 w-full cursor-pointer rounded-xl border border-[var(--border)] bg-white px-3 text-base outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-blue-100"
              value={month}
              onChange={(event) => setMonth(Number(event.target.value))}
              required
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
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
              required
            >
              {yearOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-8 flex items-start gap-4 border-t border-[var(--border)] pt-6">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-[var(--accent)]">
            <PiggyBank className="size-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
              Langkah 2
            </p>
            <h2 className="mt-1 text-lg font-semibold">Isi rencana uang</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
              Pemasukan dan target tabungan jadi dasar untuk jatah aman harian.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium">Total pemasukan bulanan</span>
            <input
              className="mt-2 h-12 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-base outline-none transition placeholder:text-slate-400 focus:border-[var(--accent)] focus:ring-4 focus:ring-emerald-100"
              type="text"
              inputMode="numeric"
              pattern="[0-9.]*"
              value={income}
              onChange={(event) =>
                setIncome(formatNumberInput(event.target.value))
              }
              placeholder="Contoh: 7.500.000"
              required
            />
            <span className="mt-2 block text-xs text-[var(--muted-foreground)]">
              Masukkan gaji utama atau pemasukan paling pasti bulan ini.
            </span>
          </label>

          <label className="block">
            <span className="text-sm font-medium">Target tabungan</span>
            <input
              className="mt-2 h-12 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-base outline-none transition placeholder:text-slate-400 focus:border-[var(--accent)] focus:ring-4 focus:ring-emerald-100"
              type="text"
              inputMode="numeric"
              pattern="[0-9.]*"
              value={savingTarget}
              onChange={(event) =>
                setSavingTarget(formatNumberInput(event.target.value))
              }
              placeholder="Contoh: 1.500.000"
              required
            />
            <span className="mt-2 block text-xs text-[var(--muted-foreground)]">
              Target ini dipotong dulu sebelum Gatra menghitung budget belanja.
            </span>
          </label>
        </div>

        <div className="mt-8 flex items-start gap-4 border-t border-[var(--border)] pt-6">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[var(--primary)]">
            <ListChecks className="size-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary)]">
              Langkah 3
            </p>
            <h2 className="mt-1 text-lg font-semibold">Bagi limit kategori</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
              Isi batas per kategori yang paling sering bocor. Kosongkan kalau
              belum mau diberi limit.
            </p>
          </div>
        </div>

        {categories.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-[var(--border)] bg-slate-50 p-5 text-sm text-[var(--muted-foreground)]">
            Kategori belum tersedia.
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {categories.map((category) => (
              <label
                className="rounded-2xl border border-[var(--border)] bg-slate-50 p-4"
                key={category.id}
              >
                <span className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-lg shadow-sm">
                    {category.emoji}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">
                      {category.name}
                    </span>
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {trackingTypeLabels[category.tracking_type] ??
                        category.tracking_type}
                    </span>
                  </span>
                </span>
                <input
                  className="mt-3 h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-base outline-none transition placeholder:text-slate-400 focus:border-[var(--primary)] focus:ring-4 focus:ring-blue-100"
                  inputMode="numeric"
                  onChange={(event) =>
                    handleCategoryLimitChange(category.id, event.target.value)
                  }
                  pattern="[0-9.]*"
                  placeholder="Limit bulanan"
                  type="text"
                  value={categoryLimitValues[category.id] ?? ""}
                />
              </label>
            ))}
          </div>
        )}
      </section>

      <BudgetPreviewPanel
        categoryLimitSummary={categoryLimitSummary}
        onUsePreset={handleUsePreset}
        preview={budgetPreview}
      />

      <div className="lg:col-span-2">
        <p className={`rounded-xl border px-4 py-3 text-sm ${statusClass}`} role="status">
          {isLoadingBudget ? "Mengecek budget bulan ini..." : statusMessage}
        </p>

        {message ? (
          <p className={`mt-4 rounded-xl border px-4 py-3 text-sm ${messageClass}`} role="status">
            {message}
          </p>
        ) : null}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button
            className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            type="submit"
            disabled={isSaving || isDeleting || isLoadingBudget}
          >
            {messageTone === "success" ? (
              <CheckCircle2 className="size-5" />
            ) : (
              <Save className="size-5" />
            )}
            {isSaving
              ? "Menyimpan..."
              : isLoadingBudget
                ? "Mengecek..."
                : hasExistingBudget
                  ? "Update Budget"
                  : "Simpan Budget"}
          </button>

          {showExistingBudgetActions ? (
            <button
              className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 shadow-sm transition hover:bg-red-50 focus:outline-none focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              disabled={isSaving || isDeleting || isLoadingBudget}
              onClick={handleDeleteBudget}
              type="button"
            >
              <Trash2 className="size-5" />
              {isDeleting ? "Menghapus..." : "Hapus Budget Bulan Ini"}
            </button>
          ) : null}

          <Link
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--foreground)] shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-100 sm:w-auto"
            href="/dashboard"
          >
            <ArrowLeft className="size-5" />
            Kembali ke Dashboard
          </Link>
        </div>
      </div>
    </form>
  );
}

function BudgetPreviewPanel({
  categoryLimitSummary,
  onUsePreset,
  preview,
}: {
  categoryLimitSummary: CategoryLimitSummary;
  onUsePreset: (percent: number) => void;
  preview: BudgetPreview;
}) {
  const toneClass = budgetPreviewToneClasses[preview.tone];
  const categoryToneClass = budgetPreviewToneClasses[categoryLimitSummary.tone];

  return (
    <aside className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6 lg:sticky lg:top-6 lg:self-start">
      <div className="flex items-start gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-[var(--foreground)]">
          <Calculator className="size-6" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
            Langkah 4
          </p>
          <h2 className="mt-1 text-lg font-semibold">Cek realistis</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
            Preview ini berubah langsung sebelum budget disimpan.
          </p>
        </div>
      </div>

      <div className={`mt-6 rounded-2xl border p-4 ${toneClass.panel}`}>
        <div className="flex items-center justify-between gap-3">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${toneClass.badge}`}>
            {preview.label}
          </span>
          <Target className="size-5 shrink-0" />
        </div>
        <p className="mt-4 text-sm font-semibold">{preview.headline}</p>
        <p className="mt-2 text-sm leading-6">{preview.detail}</p>
      </div>

      <div className="mt-5 rounded-2xl bg-slate-50 p-4">
        <p className="text-sm font-medium text-[var(--muted-foreground)]">
          Estimasi jatah aman harian
        </p>
        <p className="mt-2 break-words text-3xl font-semibold">
          {formatRupiah(preview.dailyAllowance)}
        </p>
        <p className="mt-2 text-xs leading-5 text-[var(--muted-foreground)]">
          Dibagi dari budget belanja untuk {preview.daysInMonth} hari.
        </p>
      </div>

      <div className="mt-5 grid gap-3">
        <BudgetPreviewMetric
          icon={<PiggyBank className="size-4" />}
          label="Saving rate"
          value={formatPercent(preview.savingRate)}
        />
        <BudgetPreviewMetric
          icon={<Wallet className="size-4" />}
          label="Budget belanja"
          value={formatRupiah(preview.budgetBelanja)}
        />
        <BudgetPreviewMetric
          icon={<Target className="size-4" />}
          label="Rekomendasi 20%"
          value={formatRupiah(preview.recommendedSaving)}
        />
      </div>

      <div className={`mt-5 rounded-2xl border p-4 ${categoryToneClass.panel}`}>
        <div className="flex items-center justify-between gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${categoryToneClass.badge}`}
          >
            {categoryLimitSummary.label}
          </span>
          <ListChecks className="size-5 shrink-0" />
        </div>
        <p className="mt-4 text-sm font-semibold">
          Total limit kategori: {formatRupiah(categoryLimitSummary.totalLimit)}
        </p>
        <p className="mt-2 text-sm leading-6">{categoryLimitSummary.detail}</p>
      </div>

      <div className="mt-6">
        <p className="text-sm font-semibold">Target cepat</p>
        <div className="mt-3 grid grid-cols-3 overflow-hidden rounded-xl border border-[var(--border)]">
          {targetPresets.map((percent) => (
            <button
              className="h-11 cursor-pointer border-r border-[var(--border)] bg-white text-sm font-semibold transition last:border-r-0 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!preview.hasIncome}
              key={percent}
              onClick={() => onUsePreset(percent)}
              type="button"
            >
              {percent}%
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

function BudgetPreviewMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-white px-3 py-3">
      <div className="flex min-w-0 items-center gap-2 text-sm text-[var(--muted-foreground)]">
        <span className="shrink-0">{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <span className="break-words text-right text-sm font-semibold">{value}</span>
    </div>
  );
}

function getInitialCategoryLimitValues(
  categories: CategoryOption[],
  limits: CategoryLimitInitial[],
) {
  const limitByCategory = new Map(
    limits
      .filter((limit) => limit.category_id)
      .map((limit) => [
        limit.category_id as string,
        formatNumberInput(limit.limit_amount),
      ]),
  );

  return Object.fromEntries(
    categories.map((category) => [
      category.id,
      limitByCategory.get(category.id) ?? "",
    ]),
  );
}

function parseLimitInput(value: string | undefined) {
  const number = parseNumberInput(value ?? "");

  return Number.isFinite(number) ? number : 0;
}

function getCategoryLimitSummary({
  budgetBelanja,
  values,
}: {
  budgetBelanja: number;
  values: Record<string, string>;
}): CategoryLimitSummary {
  const totalLimit = Object.values(values).reduce(
    (total, value) => total + parseLimitInput(value),
    0,
  );
  const gap = budgetBelanja - totalLimit;

  if (totalLimit <= 0) {
    return {
      detail:
        "Limit kategori belum diisi. Dashboard tetap jalan, tapi belum bisa menunjukkan kategori mana yang mulai bocor.",
      gap,
      hasAnyLimit: false,
      label: "Belum dibagi",
      tone: "slate",
      totalLimit,
    };
  }

  if (budgetBelanja <= 0) {
    return {
      detail:
        "Budget belanja masih 0, jadi limit kategori belum punya ruang aman untuk dibandingkan.",
      gap,
      hasAnyLimit: true,
      label: "Cek budget",
      tone: "red",
      totalLimit,
    };
  }

  if (gap < 0) {
    return {
      detail: `Total limit kategori lebih besar ${formatRupiah(
        Math.abs(gap),
      )} dari budget belanja. Turunkan beberapa kategori supaya rencana lebih realistis.`,
      gap,
      hasAnyLimit: true,
      label: "Lewat budget",
      tone: "red",
      totalLimit,
    };
  }

  if (gap <= budgetBelanja * 0.1) {
    return {
      detail: `Hampir seluruh budget belanja sudah dibagi. Sisa cadangan ${formatRupiah(
        gap,
      )}.`,
      gap,
      hasAnyLimit: true,
      label: "Ketat",
      tone: "amber",
      totalLimit,
    };
  }

  return {
    detail: `Masih ada cadangan ${formatRupiah(
      gap,
    )} di luar limit kategori. Rencana kategori terlihat aman.`,
    gap,
    hasAnyLimit: true,
    label: "Aman",
    tone: "green",
    totalLimit,
  };
}

function getBudgetPreview({
  daysInMonth,
  income,
  savingTarget,
}: {
  daysInMonth: number;
  income: number;
  savingTarget: number;
}): BudgetPreview {
  const safeDaysInMonth = Math.max(daysInMonth, 1);
  const hasIncome = Number.isFinite(income) && income > 0;
  const hasSavingTarget = Number.isFinite(savingTarget) && savingTarget >= 0;
  const safeIncome = hasIncome ? income : 0;
  const safeSavingTarget = hasSavingTarget ? savingTarget : 0;
  const rawBudgetBelanja = safeIncome - safeSavingTarget;
  const budgetBelanja = Math.max(rawBudgetBelanja, 0);
  const savingRate = hasIncome ? (safeSavingTarget / safeIncome) * 100 : 0;
  const recommendedSaving = hasIncome ? Math.round(safeIncome * 0.2) : 0;
  const dailyAllowance = budgetBelanja / safeDaysInMonth;

  const base = {
    budgetBelanja,
    dailyAllowance,
    daysInMonth: safeDaysInMonth,
    hasIncome,
    recommendedSaving,
    savingRate,
  };

  if (!hasIncome) {
    return {
      ...base,
      detail:
        "Masukkan pemasukan utama supaya Gatra bisa memberi target cepat dan estimasi jatah aman.",
      headline: "Mulai dari pemasukan bulanan.",
      label: "Mulai isi",
      tone: "slate",
    };
  }

  if (!hasSavingTarget) {
    return {
      ...base,
      detail:
        "Target tabungan wajib angka minimal 0. Setelah diisi, preview jatah aman langsung muncul.",
      headline: "Target tabungan belum valid.",
      label: "Lengkapi",
      tone: "blue",
    };
  }

  if (safeSavingTarget <= 0) {
    return {
      ...base,
      detail:
        "Budget belanja masih longgar, tapi Gatra belum bisa mengukur progress tabungan tanpa target.",
      headline: "Belum ada target tabungan.",
      label: "Belum target",
      tone: "blue",
    };
  }

  if (rawBudgetBelanja < 0) {
    return {
      ...base,
      detail:
        "Target lebih besar dari pemasukan utama. Masih bisa kalau ada pemasukan tambahan, tapi jatah aman utama jadi 0.",
      headline: "Target tabungan terlalu berat.",
      label: "Berat",
      tone: "red",
    };
  }

  if (savingRate >= 50) {
    return {
      ...base,
      detail:
        "Setengah pemasukan langsung masuk target. Cocok untuk mode hemat ketat, tapi ruang belanja harian tipis.",
      headline: "Target sangat agresif.",
      label: "Super ketat",
      tone: "amber",
    };
  }

  if (savingRate >= 30) {
    return {
      ...base,
      detail:
        "Target masih mungkin dikejar, tapi pengeluaran harian perlu disiplin dari awal bulan.",
      headline: "Target lumayan ketat.",
      label: "Ketat",
      tone: "amber",
    };
  }

  if (savingRate >= 10) {
    return {
      ...base,
      detail:
        "Rasio tabungan sehat dan masih menyisakan ruang belanja yang bisa dikontrol harian.",
      headline: "Target terlihat realistis.",
      label: "Sehat",
      tone: "green",
    };
  }

  return {
    ...base,
    detail:
      "Target aman untuk mulai, tapi masih bisa dinaikkan kalau mau progress tabungan lebih terasa.",
    headline: "Target masih santai.",
    label: "Santai",
    tone: "blue",
  };
}

const budgetPreviewToneClasses: Record<
  BudgetPreviewTone,
  { badge: string; panel: string }
> = {
  amber: {
    badge: "bg-amber-100 text-amber-800",
    panel: "border-amber-200 bg-amber-50 text-amber-800",
  },
  blue: {
    badge: "bg-blue-100 text-blue-800",
    panel: "border-blue-200 bg-blue-50 text-blue-800",
  },
  green: {
    badge: "bg-emerald-100 text-emerald-800",
    panel: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  red: {
    badge: "bg-red-100 text-red-800",
    panel: "border-red-200 bg-red-50 text-red-800",
  },
  slate: {
    badge: "bg-slate-200 text-slate-700",
    panel: "border-slate-200 bg-slate-50 text-slate-700",
  },
};
