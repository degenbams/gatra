import {
  BarChart3,
  HandCoins,
  LayoutDashboard,
  ReceiptText,
  Settings2,
} from "lucide-react";
import Link from "next/link";

type AppNavItem = {
  href: string;
  icon: React.ReactNode;
  id: "budget" | "dashboard" | "income" | "recap" | "transactions";
  label: string;
};

const items: AppNavItem[] = [
  {
    href: "/dashboard",
    icon: <LayoutDashboard className="size-4" />,
    id: "dashboard",
    label: "Dashboard",
  },
  {
    href: "/transactions",
    icon: <ReceiptText className="size-4" />,
    id: "transactions",
    label: "Transaksi",
  },
  {
    href: "/income",
    icon: <HandCoins className="size-4" />,
    id: "income",
    label: "Pemasukan",
  },
  {
    href: "/recap",
    icon: <BarChart3 className="size-4" />,
    id: "recap",
    label: "Rekap",
  },
  {
    href: "/monthly-setup",
    icon: <Settings2 className="size-4" />,
    id: "budget",
    label: "Budget",
  },
];

export function AppNav({ active }: { active: AppNavItem["id"] }) {
  return (
    <nav
      aria-label="Navigasi utama Gatra"
      className="grid grid-cols-2 gap-3 rounded-2xl border border-[var(--border)] bg-white p-3 shadow-[var(--shadow-soft)] sm:grid-cols-5"
    >
      {items.map((item) => {
        const isActive = active === item.id;

        return (
          <Link
            className={`flex h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition focus:outline-none focus:ring-4 focus:ring-blue-100 ${
              isActive
                ? "bg-[var(--primary)] text-white shadow-sm"
                : "text-[var(--foreground)] hover:bg-slate-50"
            }`}
            href={item.href}
            key={item.id}
          >
            {item.icon}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
