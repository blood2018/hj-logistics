const stats = [
  { value: "24시간", label: "당일 배차 대응" },
  { value: "전국", label: "화물 네트워크" },
  { value: "1,200+", label: "협력 차주 네트워크" },
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-linear-to-b from-blue-950 via-blue-900 to-slate-900">
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.25),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(30,64,175,0.35),transparent_50%)]"
      />

      <div className="relative mx-auto flex max-w-6xl flex-col items-start px-6 py-24 sm:py-32">
        <span className="rounded-full border border-blue-400/30 bg-blue-400/10 px-4 py-1.5 text-sm font-medium text-blue-200">
          B2B 화물주선 전문 물류 파트너
        </span>

        <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
          신뢰와 정확성의 B2B 화물운송 파트너,
          <br />
          <span className="text-blue-300">홍진종합물류</span>
        </h1>

        <p className="mt-6 max-w-xl text-lg leading-relaxed text-blue-100/80">
          전국 화물 네트워크와 전문 배차 시스템으로 화주사의 물류를 정확하고
          안정적으로 책임집니다. 지금 바로 견적을 요청하세요.
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <a
            href="#quote"
            className="rounded-full bg-white px-8 py-4 text-center text-base font-semibold text-blue-950 transition-colors hover:bg-blue-100"
          >
            실시간 견적 문의하기
          </a>
          <a
            href="#strengths"
            className="rounded-full border border-white/30 px-8 py-4 text-center text-base font-semibold text-white transition-colors hover:bg-white/10"
          >
            회사 강점 보기
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
