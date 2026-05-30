"use client";

import { Download } from "lucide-react";
import { useState } from "react";

type PdfRow = Record<string, string>;

export type RecapPdfData = {
  appName: string;
  tagline: string;
  userLabel: string;
  periodLabel: string;
  exportDate: string;
  fileName: string;
  summary: PdfRow[];
  incomeEntries: PdfRow[];
  categoryBreakdown: PdfRow[];
  dailyTracking: {
    category: string;
    rows: PdfRow[];
    total: string;
  }[];
  weeklyTracking: {
    category: string;
    rows: PdfRow[];
    total: string;
  }[];
  transactions: PdfRow[];
};

type AutoTableModule = typeof import("jspdf-autotable");
type JsPdfModule = typeof import("jspdf");

type LastAutoTable = {
  lastAutoTable?: {
    finalY?: number;
  };
};

export function ExportRecapPdfButton({ data }: { data: RecapPdfData }) {
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    setIsExporting(true);

    try {
      const [{ jsPDF }, { autoTable }] = (await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ])) as [JsPdfModule, AutoTableModule];

      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 40;
      let y = 42;

      doc.setProperties({
        author: "Gatra",
        subject: `Laporan bulanan ${data.periodLabel}`,
        title: `Gatra - Rekap ${data.periodLabel}`,
      });

      const addHeader = () => {
        doc.setFillColor(37, 99, 235);
        doc.rect(0, 0, pageWidth, 96, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(24);
        doc.text(data.appName, margin, 42);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(data.tagline, margin, 62);
        doc.setFontSize(12);
        doc.text(`Rekap ${data.periodLabel}`, margin, 84);
      };

      const addFooter = () => {
        const pages = doc.getNumberOfPages();
        for (let page = 1; page <= pages; page += 1) {
          doc.setPage(page);
          doc.setTextColor(100, 116, 139);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.text(
            `Gatra - ${data.periodLabel}`,
            margin,
            pageHeight - 22,
          );
          doc.text(
            `Halaman ${page} dari ${pages}`,
            pageWidth - margin,
            pageHeight - 22,
            { align: "right" },
          );
        }
      };

      const ensureSpace = (height: number) => {
        if (y + height > pageHeight - 48) {
          doc.addPage();
          y = margin;
        }
      };

      const addSectionTitle = (title: string) => {
        ensureSpace(34);
        doc.setTextColor(15, 23, 42);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.text(title, margin, y);
        y += 12;
      };

      const addTable = (
        title: string,
        head: string[],
        body: string[][],
        options?: { compact?: boolean },
      ) => {
        addSectionTitle(title);
        autoTable(doc, {
          body:
            body.length > 0
              ? body
              : [head.map((_, index) => (index === 0 ? "Belum ada data" : ""))],
          head: [head],
          margin: { left: margin, right: margin },
          startY: y,
          styles: {
            cellPadding: options?.compact ? 5 : 7,
            font: "helvetica",
            fontSize: options?.compact ? 8 : 9,
            lineColor: [226, 232, 240],
            lineWidth: 0.5,
            overflow: "linebreak",
            textColor: [15, 23, 42],
          },
          headStyles: {
            fillColor: [37, 99, 235],
            fontStyle: "bold",
            textColor: [255, 255, 255],
          },
          alternateRowStyles: {
            fillColor: [248, 250, 252],
          },
          theme: "grid",
        });
        y =
          ((doc as unknown as LastAutoTable).lastAutoTable?.finalY ?? y) + 26;
      };

      addHeader();
      y = 124;

      doc.setTextColor(51, 65, 85);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`User: ${data.userLabel}`, margin, y);
      doc.text(`Tanggal export: ${data.exportDate}`, margin, y + 16);
      y += 46;

      addTable(
        "Ringkasan",
        ["Metrik", "Nilai"],
        data.summary.map((row) => [row.label, row.value]),
      );

      addTable(
        "Daftar Pemasukan Tambahan",
        ["Tanggal", "Sumber", "Nominal", "Catatan"],
        data.incomeEntries.map((row) => [
          row.date,
          row.source,
          row.amount,
          row.note,
        ]),
        { compact: true },
      );

      addTable(
        "Breakdown Pengeluaran per Kategori",
        ["Kategori", "Total", "Persentase"],
        data.categoryBreakdown.map((row) => [
          row.category,
          row.total,
          row.percent,
        ]),
      );

      addTable(
        "Daily Tracking",
        ["Kategori", "Tanggal", "Total"],
        data.dailyTracking.flatMap((entry) =>
          entry.rows.length > 0
            ? entry.rows.map((row) => [
                entry.category,
                row.period,
                row.total,
              ])
            : [[entry.category, "Belum ada transaksi", entry.total]],
        ),
        { compact: true },
      );

      addTable(
        "Weekly Tracking",
        ["Kategori", "Minggu", "Total"],
        data.weeklyTracking.flatMap((entry) =>
          entry.rows.length > 0
            ? entry.rows.map((row) => [
                entry.category,
                row.period,
                row.total,
              ])
            : [[entry.category, "Belum ada transaksi", entry.total]],
        ),
        { compact: true },
      );

      addTable(
        "Daftar Transaksi",
        ["Tanggal", "Kategori", "Nominal", "Catatan"],
        data.transactions.map((row) => [
          row.date,
          row.category,
          row.amount,
          row.note,
        ]),
        { compact: true },
      );

      addFooter();
      doc.save(data.fileName);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <button
      className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
      type="button"
      onClick={handleExport}
      disabled={isExporting}
    >
      <Download className="size-4" />
      {isExporting ? "Membuat PDF..." : "Export PDF"}
    </button>
  );
}
