import Link from "next/link";

const NAV_ITEMS = [
  { href: "/admin", label: "견적 문의" },
  { href: "/admin/dispatch", label: "운송 내역" },
] as const;

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1600px] gap-6 px-6">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="py-4 text-sm font-medium text-slate-600 hover:text-blue-900"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
      {children}
    </div>
  );
}
