import type { CategoryLimitItem } from "@/lib/category-limits";
import { formatPercent, formatRupiah } from "@/lib/format";

export type MonthlyInsightTone = "amber" | "blue" | "green" | "red" | "slate";

export type MonthlyInsight = {
  detail: string;
  kind: "budget" | "category" | "limit" | "saving" | "setup";
  label: string;
  title: string;
  tone: MonthlyInsightTone;
};

export type MonthlyInsightCategory = {
  emoji?: string | null;
  label?: string;
  name: string;
  percent: number;
  total: number;
};

export function buildMonthlyInsights({
  budgetBelanja,
  categoryBreakdown,
  categoryLimitItems,
  hasBudget,
  savingAktual,
  savingTarget,
  sisaBudgetAman,
  totalIncome,
  totalPengeluaran,
  transactionCount,
}: {
  budgetBelanja: number;
  categoryBreakdown: MonthlyInsightCategory[];
  categoryLimitItems: CategoryLimitItem[];
  hasBudget: boolean;
  savingAktual: number;
  savingTarget: number;
  sisaBudgetAman: number;
  totalIncome: number;
  totalPengeluaran: number;
  transactionCount: number;
}) {
  const insights = [
    getSetupInsight({ hasBudget, totalIncome, transactionCount }),
    getSavingInsight({ hasBudget, savingAktual, savingTarget }),
    getBudgetInsight({
      budgetBelanja,
      hasBudget,
      sisaBudgetAman,
      totalPengeluaran,
    }),
    getCategoryInsight({ categoryBreakdown, totalPengeluaran, transactionCount }),
    getCategoryLimitInsight(categoryLimitItems),
  ].filter(Boolean) as MonthlyInsight[];

  return insights
    .sort((a, b) => getTonePriority(a.tone) - getTonePriority(b.tone))
    .slice(0, 4);
}

function getSetupInsight({
  hasBudget,
  totalIncome,
  transactionCount,
}: {
  hasBudget: boolean;
  totalIncome: number;
  transactionCount: number;
}): MonthlyInsight | null {
  if (!hasBudget) {
    return {
      detail:
        "Pemasukan dan target tabungan bulan ini belum jadi dasar hitungan.",
      kind: "setup",
      label: "Perlu setup",
      title: "Budget bulan ini belum diatur",
      tone: "blue",
    };
  }

  if (totalIncome <= 0) {
    return {
      detail:
        "Masukkan pemasukan utama atau tambahan supaya ruang belanja aman bisa terbaca.",
      kind: "setup",
      label: "Data kurang",
      title: "Pemasukan belum masuk",
      tone: "slate",
    };
  }

  if (transactionCount === 0) {
    return {
      detail:
        "Begitu transaksi dicatat, Gatra mulai membaca kategori dominan dan limit yang ketarik.",
      kind: "setup",
      label: "Belum ada transaksi",
      title: "Pola bulan ini belum kebaca",
      tone: "slate",
    };
  }

  return null;
}

function getSavingInsight({
  hasBudget,
  savingAktual,
  savingTarget,
}: {
  hasBudget: boolean;
  savingAktual: number;
  savingTarget: number;
}): MonthlyInsight | null {
  if (!hasBudget) {
    return null;
  }

  if (savingTarget <= 0) {
    return {
      detail:
        "Target tabungan masih kosong, jadi Gatra belum bisa bilang bulan ini on track atau tidak.",
      kind: "saving",
      label: "Belum diatur",
      title: "Target tabungan belum ada",
      tone: "slate",
    };
  }

  const difference = savingAktual - savingTarget;

  if (difference >= 0) {
    return {
      detail:
        difference > 0
          ? `Sisa uang saat ini lebih ${formatRupiah(difference)} dari target tabungan.`
          : "Sisa uang saat ini pas dengan target tabungan.",
      kind: "saving",
      label: "On track",
      title: "Target tabungan masih aman",
      tone: "green",
    };
  }

  return {
    detail: `Kurang ${formatRupiah(
      Math.abs(difference),
    )}. Tahan belanja atau tambah income sebesar angka itu supaya target balik aman.`,
    kind: "saving",
    label: "Perlu dikejar",
    title: "Target tabungan mulai ketarik",
    tone: "red",
  };
}

function getBudgetInsight({
  budgetBelanja,
  hasBudget,
  sisaBudgetAman,
  totalPengeluaran,
}: {
  budgetBelanja: number;
  hasBudget: boolean;
  sisaBudgetAman: number;
  totalPengeluaran: number;
}): MonthlyInsight | null {
  if (!hasBudget) {
    return null;
  }

  if (budgetBelanja < 0) {
    return {
      detail: `Target tabungan lebih besar ${formatRupiah(
        Math.abs(budgetBelanja),
      )} dari pemasukan. Target perlu diturunkan atau income perlu ditambah.`,
      kind: "budget",
      label: "Terlalu ketat",
      title: "Budget belanja minus",
      tone: "red",
    };
  }

  if (budgetBelanja === 0) {
    return {
      detail:
        "Seluruh pemasukan diarahkan ke tabungan. Pengeluaran sekecil apa pun akan menarik target.",
      kind: "budget",
      label: "Nol ruang",
      title: "Ruang belanja belum tersedia",
      tone: "amber",
    };
  }

  if (sisaBudgetAman < 0) {
    return {
      detail: `Pengeluaran sudah lewat ${formatRupiah(
        Math.abs(sisaBudgetAman),
      )} dari budget belanja aman bulan ini.`,
      kind: "budget",
      label: "Lewat budget",
      title: "Budget aman sudah jebol",
      tone: "red",
    };
  }

  if (totalPengeluaran === 0) {
    return {
      detail: `Budget belanja tersedia ${formatRupiah(
        budgetBelanja,
      )}. Belum ada pengeluaran yang mengurangi ruang aman.`,
      kind: "budget",
      label: "Belum terpakai",
      title: "Budget belanja masih utuh",
      tone: "green",
    };
  }

  if (sisaBudgetAman <= budgetBelanja * 0.15) {
    return {
      detail: `Sisa budget aman tinggal ${formatRupiah(
        sisaBudgetAman,
      )}. Mulai selektif untuk transaksi berikutnya.`,
      kind: "budget",
      label: "Tipis",
      title: "Ruang belanja hampir habis",
      tone: "amber",
    };
  }

  return {
    detail: `Masih ada ${formatRupiah(
      sisaBudgetAman,
    )} sebelum pengeluaran menyentuh batas aman bulan ini.`,
    kind: "budget",
    label: "Aman",
    title: "Budget belanja masih longgar",
    tone: "green",
  };
}

function getCategoryInsight({
  categoryBreakdown,
  totalPengeluaran,
  transactionCount,
}: {
  categoryBreakdown: MonthlyInsightCategory[];
  totalPengeluaran: number;
  transactionCount: number;
}): MonthlyInsight | null {
  if (transactionCount === 0 || totalPengeluaran <= 0) {
    return null;
  }

  const topCategory = categoryBreakdown[0];

  if (!topCategory) {
    return null;
  }

  const categoryLabel = getCategoryLabel(topCategory);

  if (topCategory.percent >= 40) {
    return {
      detail: `${categoryLabel} mengambil ${formatPercent(
        topCategory.percent,
      )} dari total pengeluaran bulan ini.`,
      kind: "category",
      label: formatRupiah(topCategory.total),
      title: `Bocor terbesar di ${categoryLabel}`,
      tone: "amber",
    };
  }

  if (topCategory.percent >= 25) {
    return {
      detail: `${categoryLabel} masih jadi pengeluaran paling dominan: ${formatPercent(
        topCategory.percent,
      )} dari total.`,
      kind: "category",
      label: "Dominan",
      title: "Ada kategori yang perlu dipantau",
      tone: "blue",
    };
  }

  return {
    detail: `Kategori terbesar hanya ${formatPercent(
      topCategory.percent,
    )} dari total pengeluaran, belum terlalu menumpuk di satu pos.`,
    kind: "category",
    label: "Tersebar",
    title: "Pengeluaran cukup seimbang",
    tone: "green",
  };
}

function getCategoryLimitInsight(
  categoryLimitItems: CategoryLimitItem[],
): MonthlyInsight {
  const activeLimits = categoryLimitItems.filter((item) => item.limitAmount > 0);

  if (activeLimits.length === 0) {
    return {
      detail:
        "Atur limit Food, Dating, Lifestyle, atau kategori rawan supaya warning bisa muncul lebih cepat.",
      kind: "limit",
      label: "Belum aktif",
      title: "Limit kategori belum diisi",
      tone: "slate",
    };
  }

  const [worstLimit] = [...activeLimits].sort(
    (a, b) =>
      getTonePriority(a.tone) - getTonePriority(b.tone) ||
      b.percent - a.percent,
  );

  if (worstLimit.tone === "red") {
    return {
      detail: `${worstLimit.label} sudah lewat ${formatRupiah(
        Math.abs(worstLimit.remainingAmount),
      )} dari limit bulan ini.`,
      kind: "limit",
      label: "Lewat limit",
      title: "Ada kategori yang jebol",
      tone: "red",
    };
  }

  if (worstLimit.tone === "amber") {
    return {
      detail: `${worstLimit.label} sudah terpakai ${formatPercent(
        worstLimit.percent,
      )}. Sisa ${formatRupiah(Math.max(worstLimit.remainingAmount, 0))}.`,
      kind: "limit",
      label: "Hampir habis",
      title: "Kategori mulai panas",
      tone: "amber",
    };
  }

  if (worstLimit.tone === "blue") {
    return {
      detail: `${worstLimit.label} sudah lewat ${formatPercent(
        worstLimit.percent,
      )} dari limit, masih aman tapi mulai perlu dipantau.`,
      kind: "limit",
      label: "Waspada",
      title: "Limit kategori mulai ketarik",
      tone: "blue",
    };
  }

  return {
    detail:
      "Kategori yang punya limit masih berada di bawah batas aman bulan ini.",
    kind: "limit",
    label: "Aman",
    title: "Limit kategori terkendali",
    tone: "green",
  };
}

function getCategoryLabel(category: MonthlyInsightCategory) {
  if (category.label) {
    return category.label;
  }

  return category.emoji ? `${category.emoji} ${category.name}` : category.name;
}

function getTonePriority(tone: MonthlyInsightTone) {
  return {
    red: 0,
    amber: 1,
    blue: 2,
    green: 3,
    slate: 4,
  }[tone];
}
