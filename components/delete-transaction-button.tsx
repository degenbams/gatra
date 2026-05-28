"use client";

import { createClient } from "@/lib/supabase/browser";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export function DeleteTransactionButton({ transactionId }: { transactionId: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setError("");

    const confirmed = window.confirm("Hapus transaksi ini?");

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setIsDeleting(false);
      setError("Sesi login tidak ditemukan.");
      return;
    }

    const { error: deleteError } = await supabase
      .from("transactions")
      .delete()
      .eq("id", transactionId)
      .eq("user_id", user.id);

    setIsDeleting(false);

    if (deleteError) {
      setError("Transaksi belum berhasil dihapus.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 focus:outline-none focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
      >
        <Trash2 className="size-4" />
        {isDeleting ? "Hapus..." : "Hapus"}
      </button>
      {error ? <p className="text-right text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
