import Link from "next/link";
import { siteConfig } from "@/app/lib/site-config";

const navItems = [
  { href: "#strengths", label: "회사 강점" },
  { href: "#quote", label: "견적 문의" },
  { href: "#contact", label: "상담 안내" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-blue-950/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-lg font-bold tracking-tight text-white">
            {siteConfig.name}
          </span>
          <span className="hidden text-xs font-medium text-blue-300 sm:inline">
            {siteConfig.englishName}
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-blue-100 transition-colors hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <a
          href={siteConfig.phoneHref}
          className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-blue-950 transition-colors hover:bg-blue-100"
        >
          {siteConfig.phoneDisplay}
        </a>
      </div>
    </header>
  );
}
