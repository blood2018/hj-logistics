import QuoteForm from "@/app/components/QuoteForm";

export default function QuoteSection() {
  return (
    <section id="quote" className="bg-white py-24">
      <div className="mx-auto max-w-3xl px-6">
        <div className="text-center">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-blue-700">
            실시간 견적 문의
          </h2>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            지금 바로 화물 정보를 입력해 보세요
          </p>
          <p className="mt-3 text-sm text-slate-600">
            상차지와 하차지를 입력하시면 운행 거리와 예상 운임이 바로 계산됩니다.
            연락처를 남겨 주시면 담당 배차 매니저가 신속하게 연락드립니다.
          </p>
        </div>

        <div className="mt-10">
          <QuoteForm />
        </div>
      </div>
    </section>
  );
}
