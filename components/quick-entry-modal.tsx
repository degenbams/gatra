"use client";

import { IncomeForm } from "@/components/income-form";
import {
  TransactionForm,
  type CategoryOption,
} from "@/components/transaction-form";
import { HandCoins, Plus, X } from "lucide-react";
import { ReactNode, useEffect, useId, useState } from "react";

type QuickEntryButtonProps = {
  className?: string;
  initialDate: string;
  label?: string;
};

type QuickTransactionButtonProps = QuickEntryButtonProps & {
  categories: CategoryOption[];
};

const primaryButtonClass =
  "flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-100";

export function QuickTransactionButton({
  categories,
  className = primaryButtonClass,
  initialDate,
  label = "Tambah Transaksi",
}: QuickTransactionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        className={className}
        type="button"
        onClick={() => setIsOpen(true)}
      >
        <Plus className="size-4" />
        {label}
      </button>

      <QuickEntryModal
        description="Catat pengeluaran tanpa pindah halaman."
        isOpen={isOpen}
        title="Tambah transaksi cepat"
        onClose={() => setIsOpen(false)}
      >
        <TransactionForm
          categories={categories}
          initialDate={initialDate}
          onCancel={() => setIsOpen(false)}
          showBackLink={false}
          surface="plain"
        />
      </QuickEntryModal>
    </>
  );
}

export function QuickIncomeButton({
  className = primaryButtonClass,
  initialDate,
  label = "Tambah Pemasukan",
}: QuickEntryButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        className={className}
        type="button"
        onClick={() => setIsOpen(true)}
      >
        <HandCoins className="size-4" />
        {label}
      </button>

      <QuickEntryModal
        description="Catat pemasukan tambahan tanpa pindah halaman."
        isOpen={isOpen}
        title="Tambah pemasukan cepat"
        onClose={() => setIsOpen(false)}
      >
        <IncomeForm
          initialDate={initialDate}
          onCancel={() => setIsOpen(false)}
          showBackLink={false}
          surface="plain"
        />
      </QuickEntryModal>
    </>
  );
}

function QuickEntryModal({
  children,
  description,
  isOpen,
  onClose,
  title,
}: {
  children: ReactNode;
  description: string;
  isOpen: boolean;
  onClose: () => void;
  title: string;
}) {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 px-4 py-4 backdrop-blur-sm sm:items-center sm:py-8"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl outline-none sm:p-6"
        role="dialog"
      >
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-[var(--border)] pb-4">
          <div>
            <h2 className="text-lg font-semibold" id={titleId}>
              {title}
            </h2>
            <p
              className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]"
              id={descriptionId}
            >
              {description}
            </p>
          </div>
          <button
            aria-label="Tutup modal"
            className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-[var(--border)] bg-white text-[var(--muted-foreground)] shadow-sm transition hover:bg-slate-50 hover:text-[var(--foreground)] focus:outline-none focus:ring-4 focus:ring-blue-100"
            type="button"
            onClick={onClose}
          >
            <X className="size-5" />
          </button>
        </div>

        {children}
      </section>
    </div>
  );
}
