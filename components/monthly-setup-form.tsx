"use client";

import { getMonthLabel, monthOptions } from "@/lib/date";
import { formatNumberInput, parseNumberInput } from "@/lib/format";
import { createClient } from "@/lib/supabase/browser";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Save,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

type MonthlySetupFormProps = {
  initialBudget: {
    income: number | string;
    saving_target: number | string;
  } | null;
  initialMonth: number;
  initialYear: number;
};

type MessageTone = "error" | "success" | "info";

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
      className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6"
      onSubmit={handleSubmit}
    >
      <div className="flex items-start gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[var(--primary)]">
          <CalendarDays className="size-6" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Periode budget</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
            Pilih bulan dan tahun, lalu isi pemasukan serta target tabungan.
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

        <label className="block">
          <span className="text-sm font-medium">Total pemasukan bulanan</span>
          <input
            className="mt-2 h-12 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-base outline-none transition placeholder:text-slate-400 focus:border-[var(--accent)] focus:ring-4 focus:ring-emerald-100"
            type="text"
            inputMode="numeric"
            pattern="[0-9.]*"
            value={income}
            onChange={(event) => setIncome(formatNumberInput(event.target.value))}
            placeholder="Contoh: 7.500.000"
            required
          />
          <span className="mt-2 block text-xs text-[var(--muted-foreground)]">
            Titik ribuan ditambahkan otomatis supaya nominal lebih mudah dicek.
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
            Contoh: ketik 1500000, tampil menjadi 1.500.000.
          </span>
        </label>
      </div>

      <p className={`mt-6 rounded-xl border px-4 py-3 text-sm ${statusClass}`} role="status">
        {isLoadingBudget ? "Mengecek budget bulan ini..." : statusMessage}
      </p>

      {message ? (
        <p className={`mt-6 rounded-xl border px-4 py-3 text-sm ${messageClass}`} role="status">
          {message}
        </p>
      ) : null}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
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
    </form>
  );
}
