import { siteConfig } from "@/app/lib/site-config";

export default function Footer() {
  return (
    <footer id="contact" className="bg-slate-950 py-12 text-slate-400">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col justify-between gap-8 sm:flex-row">
          <div>
            <p className="text-lg font-bold text-white">{siteConfig.name}</p>
            <p className="mt-2 text-sm">{siteConfig.address}</p>
          </div>

          <div className="text-sm">
            <p>대표전화 {siteConfig.phoneDisplay}</p>
            <p className="mt-1">이메일 {siteConfig.email}</p>
            <p className="mt-1">사업자등록번호 {siteConfig.businessNumber}</p>
          </div>
        </div>

        <p className="mt-10 border-t border-white/10 pt-6 text-xs text-slate-500">
          &copy; {new Date().getFullYear()} {siteConfig.englishName}. All
          rights reserved.
        </p>
      </div>
    </footer>
  );
}
