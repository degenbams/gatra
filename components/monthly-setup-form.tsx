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
  initialBudget: {
    income: number | string;
    saving_target: number | string;
  } | null;
  initialMonth: number;
  initialYear: number;
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

const targetPresets = [10, 20, 30];

export function MonthlySetupForm({
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

      const { data, error } = await supabase
        .from("monthly_budgets")
        .select("income, saving_target")
        .eq("user_id", user.id)
        .eq("month", month)
        .eq("year", year)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      setIsLoadingBudget(false);

      if (error) {
        setMessageTone("error");
        setMessage("Budget bulan ini belum bisa dimuat. Coba lagi sebentar.");
        return;
      }

      if (data) {
        setIncome(formatNumberInput(data.income));
        setSavingTarget(formatNumberInput(data.saving_target));
        setHasExistingBudget(true);
        setStatusMessage("Budget untuk bulan ini sudah tersimpan");
        setMessageTone("info");
        setMessage(`Data ${getMonthLabel(month)} ${year} siap diedit.`);
        return;
      }

      setIncome("");
      setSavingTarget("");
      setHasExistingBudget(false);
      setStatusMessage("Belum ada budget untuk bulan ini");
      setMessageTone("info");
      setMessage(`Belum ada budget untuk ${getMonthLabel(month)} ${year}.`);
    }

    loadBudget();

    return () => {
      isMounted = false;
    };
  }, [month, year, supabase]);

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

    setIsSaving(false);

    if (error) {
      setMessageTone("error");
      setMessage("Budget belum berhasil disimpan. Coba lagi sebentar.");
      return;
    }

    setMessageTone("success");
    setMessage(
      hasExistingBudget
        ? "Budget bulanan berhasil diperbarui."
        : "Budget bulanan berhasil disimpan.",
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

    setIncome("");
    setSavingTarget("");
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
      </section>

      <BudgetPreviewPanel
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
  onUsePreset,
  preview,
}: {
  onUsePreset: (percent: number) => void;
  preview: BudgetPreview;
}) {
  const toneClass = budgetPreviewToneClasses[preview.tone];

  return (
    <aside className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6 lg:sticky lg:top-6 lg:self-start">
      <div className="flex items-start gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-[var(--foreground)]">
          <Calculator className="size-6" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
            Langkah 3
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
