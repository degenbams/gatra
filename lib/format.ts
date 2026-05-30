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

const indonesianMonthNames = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export function formatDateID(value: string) {
  const [datePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return value;
  }

  return `${String(day).padStart(2, "0")} ${
    indonesianMonthNames[month - 1]
  } ${year}`;
}

export function formatPercent(value: number) {
  const percent = Number.isFinite(value) ? value : 0;

  return `${new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(percent)}%`;
}
