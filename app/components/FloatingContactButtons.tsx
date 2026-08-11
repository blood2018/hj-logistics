import { siteConfig } from "@/app/lib/site-config";

export default function FloatingContactButtons() {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      <a
        href={siteConfig.kakaoUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="카카오톡 빠른 상담"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FEE500] text-slate-900 shadow-lg ring-1 ring-black/5 transition-transform hover:scale-105"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-7 w-7"
        >
          <path d="M12 3C6.477 3 2 6.463 2 10.74c0 2.708 1.79 5.09 4.49 6.463-.198.727-.716 2.633-.82 3.042-.128.507.186.5.392.364.161-.107 2.566-1.74 3.607-2.446.756.108 1.535.164 2.331.164 5.523 0 10-3.463 10-7.587C22 6.463 17.523 3 12 3z" />
        </svg>
      </a>

      <a
        href={siteConfig.phoneHref}
        aria-label="전화 상담"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-950 text-white shadow-lg ring-1 ring-black/5 transition-transform hover:scale-105"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          className="h-6 w-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 6.75c0 8.284 6.716 15 15 15h1.5a1.5 1.5 0 001.5-1.5v-2.379a1 1 0 00-.757-.97l-4.244-1.06a1 1 0 00-1.021.29l-.976 1.14a12.06 12.06 0 01-5.323-5.323l1.14-.976a1 1 0 00.29-1.021L8.6 5.007a1 1 0 00-.97-.757H5.25a1.5 1.5 0 00-1.5 1.5v1z"
          />
        </svg>
      </a>
    </div>
  );
}
