import type { ReactNode } from "react";

type AuthShellProps = {
  children: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
};

export function AuthShell({
  children,
  eyebrow,
  title,
  description,
}: AuthShellProps) {
  return (
    <main className="min-h-dvh bg-[var(--surface-subtle)] px-4 py-8 text-[var(--foreground)] sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100dvh-4rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1fr_440px]">
        <section className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--primary)]">
            {eyebrow}
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-[var(--foreground)] sm:text-5xl">
            Gatra
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-8 text-[var(--muted-foreground)]">
            Rekap keuanganmu, tersusun jelas.
          </p>
          <p className="mt-6 max-w-xl text-base leading-7 text-[var(--muted-foreground)]">
            {description}
          </p>
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-[var(--shadow-soft)] sm:p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-[var(--foreground)]">
              {title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
              Gunakan email dan password untuk masuk ke ruang kerja Gatra.
            </p>
          </div>
          {children}
        </section>
      </div>
    </main>
  );
}
