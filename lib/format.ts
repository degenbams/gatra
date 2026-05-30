export function formatRupiah(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("id-ID", {
    currency: "IDR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatNumberInput(value: number | string | null | undefined) {
  const digits = String(value ?? "").replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(Number(digits));
}

export function parseNumberInput(value: string) {
  const digits = value.replace(/\D/g, "");

  if (!digits) {
    return Number.NaN;
  }

  return Number(digits);
}

export function formatDateID(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00+07:00`));
}

export function formatPercent(value: number) {
  const percent = Number.isFinite(value) ? value : 0;

  return `${new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(percent)}%`;
}
