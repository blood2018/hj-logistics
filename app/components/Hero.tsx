import Image from "next/image";
import { siteConfig } from "@/app/lib/site-config";

const stats = [
  { value: "24시간", label: "당일 배차 대응" },
  { value: "전국", label: "화물 네트워크" },
  { value: "1,200+", label: "협력 차주 네트워크" },
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-blue-950">
      {/* 고속도로 항공 사진 (Unsplash 무료 사진 photo-1780000291226) 위에 남색을 덮어 글자가 잘 보이게 합니다. */}
      <Image
        src="/images/hero-highway.jpg"
        alt=""
        fill
        preload
        sizes="100vw"
        className="object-cover"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-linear-to-r from-blue-950 via-blue-950/85 to-blue-900/40"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-linear-to-t from-slate-950/70 via-transparent to-transparent"
      />

      <div className="relative mx-auto flex max-w-6xl flex-col items-start px-6 py-24 sm:py-32">
        <span className="rounded-full border border-blue-400/30 bg-blue-400/10 px-4 py-1.5 text-sm font-medium text-blue-200">
          B2B 화물주선 전문 물류 파트너
        </span>

        <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
          신뢰와 정확성의 B2B 화물운송 파트너,
          <br />
          <span className="text-blue-300">{siteConfig.name}</span>
        </h1>

        <p className="mt-6 max-w-xl text-lg leading-relaxed text-blue-100/80">
          전국 화물 네트워크와 전문 배차 시스템으로 화주사의 물류를 정확하고
          안정적으로 책임집니다. 상담과 견적은 언제든 무료입니다.
        </p>

        {/* 대문 문의 창구: 전화 문의 / 온라인 견적 두 가지를 나란히 크게 보여줍니다. */}
        <div className="mt-10 grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
          <a
            href={siteConfig.phoneHref}
            className="group flex items-center gap-4 rounded-2xl bg-white px-6 py-5 text-blue-950 shadow-lg transition-colors hover:bg-blue-50"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-950 text-white">
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
            </span>
            <span className="flex flex-col">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-blue-700">
                전화 상담
                <span className="rounded-full bg-blue-950 px-2 py-0.5 text-[11px] font-bold text-white">24시간 · 무료</span>
              </span>
              <span className="text-2xl font-bold tracking-tight">{siteConfig.phoneDisplay}</span>
            </span>
          </a>
          <a
            href="#quote"
            className="group flex items-center gap-4 rounded-2xl border border-white/25 bg-white/10 px-6 py-5 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-blue-950">
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
                  d="M9 7h6m-6 4h6m-6 4h3M6 3h12a1 1 0 011 1v16a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z"
                />
              </svg>
            </span>
            <span className="flex flex-col">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-blue-200">
                온라인 견적
                <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-blue-950">24시간 · 무료</span>
              </span>
              <span className="text-xl font-bold">운임 바로 계산하기 →</span>
            </span>
          </a>
        </div>

        <dl className="mt-16 grid w-full max-w-2xl grid-cols-3 gap-6 border-t border-white/10 pt-8">
          {stats.map((stat) => (
            <div key={stat.label}>
              <dt className="text-2xl font-bold text-white sm:text-3xl">
                {stat.value}
              </dt>
              <dd className="mt-1 text-sm text-blue-200/70">{stat.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
