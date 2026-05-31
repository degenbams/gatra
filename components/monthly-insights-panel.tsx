import type { MonthlyInsight } from "@/lib/monthly-insights";
import type { LucideIcon } from "lucide-react";
import {
  Info,
  Lightbulb,
  ListChecks,
  PiggyBank,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

export function MonthlyInsightsPanel({
  insights,
  periodLabel,
}: {
  insights: MonthlyInsight[];
  periodLabel: string;
}) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex size-11 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
            <Lightbulb className="size-5" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">Insight bulanan</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
            Sinyal penting untuk {periodLabel}.
          </p>
        </div>
        <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
          {insights.length} insight
        </span>
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-2">
        {insights.map((insight) => {
          const Icon = iconByKind[insight.kind];

          return (
            <article
              className={`rounded-2xl border p-4 ${cardClassesByTone[insight.tone]}`}
              key={`${insight.kind}-${insight.title}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div
                  className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${iconClassesByTone[insight.tone]}`}
                >
                  <Icon className="size-5" />
                </div>
                <span
                  className={`min-w-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${badgeClassesByTone[insight.tone]}`}
                >
                  {insight.label}
                </span>
              </div>
              <h3 className="mt-4 text-sm font-semibold">{insight.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                {insight.detail}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

const iconByKind = {
  budget: ShieldCheck,
  category: TrendingUp,
  limit: ListChecks,
  saving: PiggyBank,
  setup: Info,
} satisfies Record<MonthlyInsight["kind"], LucideIcon>;

const cardClassesByTone = {
  amber: "border-amber-200 bg-amber-50/45",
  blue: "border-blue-200 bg-blue-50/45",
  green: "border-emerald-200 bg-emerald-50/45",
  red: "border-red-200 bg-red-50/45",
  slate: "border-slate-200 bg-slate-50",
} satisfies Record<MonthlyInsight["tone"], string>;

const iconClassesByTone = {
  amber: "bg-amber-100 text-amber-700",
  blue: "bg-blue-100 text-blue-700",
  green: "bg-emerald-100 text-emerald-700",
  red: "bg-red-100 text-red-700",
  slate: "bg-white text-slate-700 shadow-sm",
} satisfies Record<MonthlyInsight["tone"], string>;

const badgeClassesByTone = {
  amber: "bg-white text-amber-700 ring-amber-200",
  blue: "bg-white text-blue-700 ring-blue-200",
  green: "bg-white text-emerald-700 ring-emerald-200",
  red: "bg-white text-red-700 ring-red-200",
  slate: "bg-white text-slate-700 ring-slate-200",
} satisfies Record<MonthlyInsight["tone"], string>;
