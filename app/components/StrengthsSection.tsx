import Image from "next/image";

const strengths = [
  {
    title: "24시간 당일 배차",
    description:
      "긴급 화물도 문제없이, 24시간 상시 배차 시스템으로 요청 즉시 최적의 차량을 연결해 드립니다.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8v4l2.5 2.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
  },
  {
    title: "전국 화물 네트워크",
    description:
      "전국 단위로 구축된 협력 차주망을 기반으로 지역과 거리에 관계없이 안정적인 운송을 지원합니다.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.6 9h16.8M3.6 15h16.8M11.5 3a17 17 0 000 18M12.5 3a17 17 0 010 18M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
  },
  {
    title: "B2B 맞춤 정산 지원",
    description:
      "화주사별 정산 주기와 방식에 맞춘 세금계산서 발행 및 정산 시스템으로 투명한 거래를 보장합니다.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 10h18M7 15h1m4 0h5M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z"
      />
    ),
  },
  {
    title: "전문 배차 매니저",
    description:
      "화물 특성에 맞는 최적 차종을 전문 배차 매니저가 직접 매칭하여 사고 없는 안전 운송을 책임집니다.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14c-4.418 0-8 2.239-8 5v1h16v-1c0-2.761-3.582-5-8-5z"
      />
    ),
  },
];

export default function StrengthsSection() {
  return (
    <section id="strengths" className="bg-slate-50 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-blue-700">
            왜 HJ LOGIS인가
          </h2>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            화주사가 믿고 맡기는 이유
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {strengths.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-950 text-white">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.8}
                  stroke="currentColor"
                  className="h-6 w-6"
                >
                  {item.icon}
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {item.description}
              </p>
            </div>
          ))}
        </div>

        {/* 현장 사진 (Unsplash 무료 사진 photo-1720811559371, photo-1708596718852) */}
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-5">
          <figure className="relative h-64 overflow-hidden rounded-2xl md:col-span-3 md:h-80">
            <Image
              src="/images/cargo-loading.jpg"
              alt="물류센터에서 화물을 싣고 있는 트럭"
              fill
              sizes="(min-width: 768px) 60vw, 100vw"
              className="object-cover"
            />
            <figcaption className="absolute inset-x-0 bottom-0 bg-linear-to-t from-blue-950/85 to-transparent px-6 pb-5 pt-16 text-white">
              <p className="text-lg font-semibold">상차부터 하차까지 한 번에</p>
              <p className="mt-1 text-sm text-blue-100/80">화물 특성에 맞는 차량을 배정해 안전하게 운송합니다.</p>
            </figcaption>
          </figure>
          <figure className="relative h-64 overflow-hidden rounded-2xl md:col-span-2 md:h-80">
            <Image
              src="/images/loading-dock.jpg"
              alt="물류센터 하역장에 나란히 선 화물차"
              fill
              sizes="(min-width: 768px) 40vw, 100vw"
              className="object-cover"
            />
            <figcaption className="absolute inset-x-0 bottom-0 bg-linear-to-t from-blue-950/85 to-transparent px-6 pb-5 pt-16 text-white">
              <p className="text-lg font-semibold">전국 화물 네트워크</p>
              <p className="mt-1 text-sm text-blue-100/80">협력 차주망으로 당일 배차를 지원합니다.</p>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
