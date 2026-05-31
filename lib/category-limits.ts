export type CategoryLimitCategory = {
  emoji: string | null;
  id: string;
  name: string;
  tracking_type?: string | null;
};

export type CategoryLimitRow = {
  category_id: string | null;
  limit_amount: number | string | null;
};

export type CategoryLimitTransaction = {
  amount: number | string | null;
  category_id: string | null;
};

export type CategoryLimitItem = {
  categoryId: string;
  emoji: string | null;
  label: string;
  limitAmount: number;
  name: string;
  percent: number;
  remainingAmount: number;
  spentAmount: number;
  statusLabel: string;
  tone: "amber" | "blue" | "green" | "red" | "slate";
  trackingType: string | null;
};

export function buildCategoryLimitItems({
  categories,
  limits,
  transactions,
}: {
  categories: CategoryLimitCategory[];
  limits: CategoryLimitRow[];
  transactions: CategoryLimitTransaction[];
}) {
  const limitByCategory = new Map<string, number>();
  const spentByCategory = new Map<string, number>();

  limits.forEach((limit) => {
    if (!limit.category_id) {
      return;
    }

    limitByCategory.set(
      limit.category_id,
      toFiniteNumber(limit.limit_amount),
    );
  });

  transactions.forEach((transaction) => {
    if (!transaction.category_id) {
      return;
    }

    spentByCategory.set(
      transaction.category_id,
      (spentByCategory.get(transaction.category_id) ?? 0) +
        toFiniteNumber(transaction.amount),
    );
  });

  return categories
    .map((category) => {
      const limitAmount = limitByCategory.get(category.id) ?? 0;
      const spentAmount = spentByCategory.get(category.id) ?? 0;
      const percent =
        limitAmount > 0 ? Math.max((spentAmount / limitAmount) * 100, 0) : 0;
      const status = getCategoryLimitStatus(spentAmount, limitAmount);

      return {
        categoryId: category.id,
        emoji: category.emoji,
        label: category.emoji ? `${category.emoji} ${category.name}` : category.name,
        limitAmount,
        name: category.name,
        percent,
        remainingAmount: limitAmount - spentAmount,
        spentAmount,
        statusLabel: status.label,
        tone: status.tone,
        trackingType: category.tracking_type ?? null,
      } satisfies CategoryLimitItem;
    })
    .filter((item) => item.limitAmount > 0 || item.spentAmount > 0)
    .sort((a, b) => {
      if (a.limitAmount <= 0 && b.limitAmount > 0) {
        return 1;
      }

      if (a.limitAmount > 0 && b.limitAmount <= 0) {
        return -1;
      }

      return b.percent - a.percent || b.spentAmount - a.spentAmount;
    });
}

export function getCategoryLimitTotals(items: CategoryLimitItem[]) {
  return items.reduce(
    (totals, item) => ({
      limitAmount: totals.limitAmount + item.limitAmount,
      spentAmount: totals.spentAmount + item.spentAmount,
    }),
    { limitAmount: 0, spentAmount: 0 },
  );
}

function getCategoryLimitStatus(spentAmount: number, limitAmount: number) {
  if (limitAmount <= 0 && spentAmount > 0) {
    return { label: "Tanpa limit", tone: "slate" as const };
  }

  if (limitAmount <= 0) {
    return { label: "Belum diatur", tone: "slate" as const };
  }

  if (spentAmount > limitAmount) {
    return { label: "Lewat limit", tone: "red" as const };
  }

  if (spentAmount >= limitAmount * 0.85) {
    return { label: "Hampir habis", tone: "amber" as const };
  }

  if (spentAmount >= limitAmount * 0.65) {
    return { label: "Waspada", tone: "blue" as const };
  }

  return { label: "Aman", tone: "green" as const };
}

function toFiniteNumber(value: number | string | null | undefined) {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}
