"use client";

import { formatRupiah } from "@/lib/format";
import { BarChart3, CalendarDays, ReceiptText } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type CategoryExpenseChartItem = {
  color: string;
  label: string;
  name: string;
  percent: number;
  total: number;
};

export type DailyExpenseChartItem = {
  date: string;
  label: string;
  total: number;
};

type DashboardChartsProps = {
  categoryData: CategoryExpenseChartItem[];
  dailyData: DailyExpenseChartItem[];
};

export function DashboardCharts({
  categoryData,
  dailyData,
}: DashboardChartsProps) {
  const hasTransactions = categoryData.length > 0;

  if (!hasTransactions) {
    return (
      <section className="rounded-2xl border border-dashed border-[var(--border)] bg-white p-6 text-center shadow-[var(--shadow-soft)] sm:p-8">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-emerald-50 text-[var(--accent)]">
          <BarChart3 className="size-6" />
        </div>
        <h2 className="mt-4 text-lg font-semibold">Grafik belum tersedia</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted-foreground)]">
          Tambahkan transaksi bulan ini dulu supaya grafik kategori dan harian
          bisa terbentuk.
        </p>
      </section>
    );
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <ChartPanel
        description="Komposisi pengeluaran berdasarkan kategori bulan berjalan."
        icon={<ReceiptText className="size-5" />}
        title="Pengeluaran per kategori"
      >
        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,260px)_1fr]">
          <MeasuredChartFrame height={256}>
            {(width, height) => (
              <PieChart height={height} width={width}>
                <Pie
                  cx="50%"
                  cy="50%"
                  data={categoryData}
                  dataKey="total"
                  innerRadius={58}
                  outerRadius={94}
                  paddingAngle={3}
                >
                  {categoryData.map((entry) => (
                    <Cell fill={entry.color} key={entry.name} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [
                    formatRupiah(Number(value)),
                    "Pengeluaran",
                  ]}
                />
              </PieChart>
            )}
          </MeasuredChartFrame>

          <div className="grid content-center gap-3">
            {categoryData.map((item) => (
              <div
                className="flex items-center justify-between gap-3 border-b border-[var(--border)] py-2 last:border-0"
                key={item.name}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {item.label}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {item.percent.toFixed(1)}% dari pengeluaran
                    </p>
                  </div>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums">
                  {formatRupiah(item.total)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </ChartPanel>

      <ChartPanel
        description="Total pengeluaran per tanggal dalam bulan berjalan."
        icon={<CalendarDays className="size-5" />}
        title="Pengeluaran harian"
      >
        <MeasuredChartFrame className="mt-6" height={288}>
          {(width, height) => (
            <BarChart
              data={dailyData}
              height={height}
              margin={{ bottom: 0, left: 0, right: 8, top: 8 }}
              width={width}
            >
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
              <XAxis
                axisLine={false}
                dataKey="label"
                tick={{ fill: "#64748b", fontSize: 12 }}
                tickLine={false}
              />
              <YAxis
                axisLine={false}
                tick={{ fill: "#64748b", fontSize: 12 }}
                tickFormatter={(value) => shortRupiah(Number(value))}
                tickLine={false}
                width={56}
              />
              <Tooltip
                formatter={(value) => [
                  formatRupiah(Number(value)),
                  "Pengeluaran",
                ]}
                labelFormatter={(label) => `Tanggal ${label}`}
              />
              <Bar dataKey="total" fill="#2563eb" radius={[8, 8, 0, 0]} />
            </BarChart>
          )}
        </MeasuredChartFrame>
      </ChartPanel>
    </section>
  );
}

function MeasuredChartFrame({
  children,
  className = "",
  height,
}: {
  children: (width: number, height: number) => React.ReactNode;
  className?: string;
  height: number;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const frame = frameRef.current;

    if (!frame) {
      return;
    }

    const updateWidth = () => {
      setWidth(Math.floor(frame.getBoundingClientRect().width));
    };

    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(frame);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div
      className={`min-w-0 ${className}`}
      ref={frameRef}
      style={{ height, minWidth: 1 }}
    >
      {width > 0 ? children(width, height) : null}
    </div>
  );
}

function ChartPanel({
  children,
  description,
  icon,
  title,
}: {
  children: React.ReactNode;
  description: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[var(--primary)]">
          {icon}
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
            {description}
          </p>
        </div>
      </div>
      {children}
    </div>
  );
}

function shortRupiah(value: number) {
  if (!Number.isFinite(value)) {
    return "Rp0";
  }

  if (Math.abs(value) >= 1_000_000) {
    return `Rp${(value / 1_000_000).toFixed(1)}jt`;
  }

  if (Math.abs(value) >= 1_000) {
    return `Rp${Math.round(value / 1_000)}rb`;
  }

  return `Rp${value}`;
}
