"use client";

import { formatNumberInput, parseNumberInput } from "@/lib/format";
import { createClient } from "@/lib/supabase/browser";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  HandCoins,
  Save,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

type IncomeFormProps = {
  initialDate: string;
  initialIncome?: {
    amount: number | string;
    date: string;
    id: string;
    note: string | null;
    source: string;
  };
  mode?: "create" | "edit";
  onCancel?: () => void;
  onSaved?: () => void;
  returnHref?: string;
  showBackLink?: boolean;
  surface?: "card" | "plain";
};

type MessageTone = "error" | "success";

export function IncomeForm({
  initialDate,
  initialIncome,
  mode = "create",
  onCancel,
  onSaved,
  returnHref,
  showBackLink = true,
  surface = "card",
}: IncomeFormProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const isEditing = mode === "edit";
  const [date, setDate] = useState(initialIncome?.date ?? initialDate);
  const [source, setSource] = useState(initialIncome?.source ?? "");
  const [amount, setAmount] = useState(formatNumberInput(initialIncome?.amount));
  const [note, setNote] = useState(initialIncome?.note ?? "");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<MessageTone>("success");
  const [isSaving, setIsSaving] = useState(false);
  const backHref = returnHref ?? (isEditing ? "/income" : "/dashboard");
  const backLabel = isEditing ? "Kembali ke Pemasukan" : "Kembali ke Dashboard";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const amountNumber = parseNumberInput(amount);
    const trimmedSource = source.trim();

    if (!date) {
      setMessageTone("error");
      setMessage("Tanggal pemasukan wajib diisi.");
      return;
    }

    if (!trimmedSource) {
      setMessageTone("error");
      setMessage("Sumber pemasukan wajib diisi.");
      return;
    }

    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      setMessageTone("error");
      setMessage("Nominal pemasukan wajib angka dan lebih dari 0.");
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

    const payload = {
      amount: amountNumber,
      date,
      note: note.trim() || null,
      source: trimmedSource,
      user_id: user.id,
    };

    if (isEditing) {
      if (!initialIncome) {
        setIsSaving(false);
        setMessageTone("error");
        setMessage("Data pemasukan tidak ditemukan.");
        return;
      }

      const { data, error } = await supabase
        .from("income_entries")
        .update(payload)
        .eq("id", initialIncome.id)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle();

      setIsSaving(false);

      if (error || !data) {
        setMessageTone("error");
        setMessage("Pemasukan belum berhasil diperbarui. Coba lagi sebentar.");
        return;
      }

      setMessageTone("success");
      setMessage("Pemasukan tambahan berhasil diperbarui.");
      router.refresh();
      onSaved?.();
      return;
    }

    const { error } = await supabase.from("income_entries").insert(payload);

    setIsSaving(false);

    if (error) {
      setMessageTone("error");
      setMessage("Pemasukan belum berhasil disimpan. Coba lagi sebentar.");
      return;
    }

    setMessageTone("success");
    setMessage("Pemasukan tambahan berhasil disimpan. Form siap untuk input berikutnya.");
    setDate(initialDate);
    setSource("");
    setAmount("");
    setNote("");
    router.refresh();
    onSaved?.();
  }

  const messageClass =
    messageTone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-red-200 bg-red-50 text-red-700";

  return (
    <form
      className={
        surface === "card"
          ? "rounded-2xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6"
          : ""
      }
      onSubmit={handleSubmit}
    >
      <div className="flex items-start gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[var(--primary)]">
          <HandCoins className="size-6" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Detail pemasukan</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
            {isEditing
              ? "Ubah tanggal, sumber, nominal, atau catatan pemasukan tambahan ini."
              : "Catat pemasukan dari freelance, jualan, bonus, atau kerja sampingan."}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium">Tanggal pemasukan</span>
          <span className="mt-2 flex h-12 items-center gap-3 rounded-xl border border-[var(--border)] bg-white px-3 transition focus-within:border-[var(--primary)] focus-within:ring-4 focus-within:ring-blue-100">
            <CalendarDays className="size-5 text-[var(--muted-foreground)]" />
            <input
              className="h-full min-w-0 flex-1 bg-transparent text-base outline-none"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
            />
          </span>
        </label>

        <label className="block">
          <span className="text-sm font-medium">Sumber pemasukan</span>
          <input
            className="mt-2 h-12 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-base outline-none transition placeholder:text-slate-400 focus:border-[var(--primary)] focus:ring-4 focus:ring-blue-100"
            type="text"
            value={source}
            onChange={(event) => setSource(event.target.value)}
            placeholder="Contoh: Freelance desain"
            required
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="text-sm font-medium">Nominal pemasukan</span>
          <input
            className="mt-2 h-12 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-base outline-none transition placeholder:text-slate-400 focus:border-[var(--accent)] focus:ring-4 focus:ring-emerald-100"
            type="text"
            inputMode="numeric"
            pattern="[0-9.]*"
            value={amount}
            onChange={(event) => setAmount(formatNumberInput(event.target.value))}
            placeholder="Contoh: 750.000"
            required
          />
          <span className="mt-2 block text-xs text-[var(--muted-foreground)]">
            Titik ribuan ditambahkan otomatis, contoh 750.000.
          </span>
        </label>

        <label className="block sm:col-span-2">
          <span className="text-sm font-medium">Catatan opsional</span>
          <textarea
            className="mt-2 min-h-28 w-full resize-y rounded-xl border border-[var(--border)] bg-white px-3 py-3 text-base outline-none transition placeholder:text-slate-400 focus:border-[var(--accent)] focus:ring-4 focus:ring-emerald-100"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Contoh: pembayaran termin pertama, bonus proyek..."
          />
        </label>
      </div>

      {message ? (
        <p className={`mt-6 rounded-xl border px-4 py-3 text-sm ${messageClass}`} role="status">
          {message}
        </p>
      ) : null}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          type="submit"
          disabled={isSaving}
        >
          {messageTone === "success" && message ? (
            <CheckCircle2 className="size-5" />
          ) : (
            <Save className="size-5" />
          )}
          {isSaving
            ? "Menyimpan..."
            : isEditing
              ? "Update Pemasukan"
              : "Simpan Pemasukan"}
        </button>

        {onCancel ? (
          <button
            className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--foreground)] shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-100 sm:w-auto"
            type="button"
            onClick={onCancel}
          >
            <ArrowLeft className="size-5" />
            Tutup
          </button>
        ) : showBackLink ? (
          <Link
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--foreground)] shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-100 sm:w-auto"
            href={backHref}
          >
            <ArrowLeft className="size-5" />
            {backLabel}
          </Link>
        ) : null}
      </div>
    </form>
  );
}
