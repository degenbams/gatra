"use client";

import { createClient } from "@/lib/supabase/browser";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ReceiptText,
  Save,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

type CategoryOption = {
  emoji: string | null;
  id: string;
  name: string;
  tracking_type: string;
};

type TransactionFormProps = {
  categories: CategoryOption[];
  initialDate: string;
  initialTransaction?: {
    amount: number | string;
    category_id: string | null;
    date: string;
    id: string;
    note: string | null;
  };
  mode?: "create" | "edit";
  returnHref?: string;
};

type MessageTone = "error" | "success";

export function TransactionForm({
  categories,
  initialDate,
  initialTransaction,
  mode = "create",
  returnHref,
}: TransactionFormProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const isEditing = mode === "edit";
  const [date, setDate] = useState(initialTransaction?.date ?? initialDate);
  const [categoryId, setCategoryId] = useState(
    initialTransaction?.category_id ?? "",
  );
  const [amount, setAmount] = useState(
    String(initialTransaction?.amount ?? ""),
  );
  const [note, setNote] = useState(initialTransaction?.note ?? "");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<MessageTone>("success");
  const [isSaving, setIsSaving] = useState(false);
  const backHref = returnHref ?? (isEditing ? "/transactions" : "/dashboard");
  const backLabel = isEditing ? "Kembali ke Riwayat" : "Kembali ke Dashboard";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const amountNumber = Number(amount);

    if (!date) {
      setMessageTone("error");
      setMessage("Tanggal transaksi wajib diisi.");
      return;
    }

    if (!categoryId) {
      setMessageTone("error");
      setMessage("Kategori pengeluaran wajib dipilih.");
      return;
    }

    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      setMessageTone("error");
      setMessage("Nominal pengeluaran wajib angka dan lebih dari 0.");
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
      category_id: categoryId,
      date,
      note: note.trim() || null,
      user_id: user.id,
    };

    if (isEditing) {
      if (!initialTransaction) {
        setIsSaving(false);
        setMessageTone("error");
        setMessage("Data transaksi tidak ditemukan.");
        return;
      }

      const { data, error } = await supabase
        .from("transactions")
        .update(payload)
        .eq("id", initialTransaction.id)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle();

      setIsSaving(false);

      if (error || !data) {
        setMessageTone("error");
        setMessage("Transaksi belum berhasil diperbarui. Coba lagi sebentar.");
        return;
      }

      setMessageTone("success");
      setMessage("Transaksi berhasil diperbarui.");
      router.refresh();
      return;
    }

    const { error } = await supabase.from("transactions").insert(payload);

    setIsSaving(false);

    if (error) {
      setMessageTone("error");
      setMessage("Transaksi belum berhasil disimpan. Coba lagi sebentar.");
      return;
    }

    setMessageTone("success");
    setMessage("Transaksi berhasil disimpan. Form sudah siap untuk input berikutnya.");
    setDate(initialDate);
    setCategoryId("");
    setAmount("");
    setNote("");
  }

  const messageClass =
    messageTone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-red-200 bg-red-50 text-red-700";

  return (
    <form
      className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6"
      onSubmit={handleSubmit}
    >
      <div className="flex items-start gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-[var(--accent)]">
          <ReceiptText className="size-6" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Detail transaksi</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
            {isEditing
              ? "Ubah tanggal, kategori, nominal, atau catatan transaksi ini."
              : "Catat pengeluaran harian dengan kategori yang sudah disiapkan."}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium">Tanggal transaksi</span>
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
          <span className="text-sm font-medium">Kategori pengeluaran</span>
          <select
            className="mt-2 h-12 w-full cursor-pointer rounded-xl border border-[var(--border)] bg-white px-3 text-base outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-blue-100"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            required
          >
            <option value="">Pilih kategori</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.emoji ? `${category.emoji} ` : ""}
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block sm:col-span-2">
          <span className="text-sm font-medium">Nominal pengeluaran</span>
          <input
            className="mt-2 h-12 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-base outline-none transition placeholder:text-slate-400 focus:border-[var(--accent)] focus:ring-4 focus:ring-emerald-100"
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="Contoh: 35000"
            required
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="text-sm font-medium">Catatan opsional</span>
          <textarea
            className="mt-2 min-h-28 w-full resize-y rounded-xl border border-[var(--border)] bg-white px-3 py-3 text-base outline-none transition placeholder:text-slate-400 focus:border-[var(--accent)] focus:ring-4 focus:ring-emerald-100"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Contoh: makan siang, bensin, kopi sore..."
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
              ? "Update Transaksi"
              : "Simpan Transaksi"}
        </button>

        <Link
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--foreground)] shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-100 sm:w-auto"
          href={backHref}
        >
          <ArrowLeft className="size-5" />
          {backLabel}
        </Link>
      </div>
    </form>
  );
}
