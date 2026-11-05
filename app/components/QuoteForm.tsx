"use client";

import Script from "next/script";
import { useActionState, useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import {
  submitQuoteRequest,
  type QuoteFormState,
} from "@/app/actions/quote-request";
import { estimateRoute, type RouteEstimate } from "@/app/actions/quote-estimate";
import { TONNAGE_OPTIONS, VEHICLE_TYPES } from "@/app/lib/quote-rates";

// 다음(카카오) 우편번호 서비스 — 키 없이 쓰는 주소 찾기 팝업
const POSTCODE_SCRIPT = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
type PostcodeData = { roadAddress: string; jibunAddress: string; address: string };
declare global {
  interface Window {
    daum?: {
      Postcode: new (options: { oncomplete: (data: PostcodeData) => void }) => { open: () => void };
    };
  }
}

const initialState: QuoteFormState = { status: "idle", message: "" };

const inputClass =
  "rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 rounded-full bg-blue-950 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
    >
      {pending ? "접수 중..." : "무료 견적 요청하기"}
    </button>
  );
}

export default function QuoteForm() {
  const [formKey, setFormKey] = useState(0);

  return (
    <QuoteFormFields
      key={formKey}
      onSubmitAnother={() => setFormKey((key) => key + 1)}
    />
  );
}

function QuoteFormFields({ onSubmitAnother }: { onSubmitAnother: () => void }) {
  const [state, formAction] = useActionState(submitQuoteRequest, initialState);
  const fieldErrors = state.fieldErrors ?? {};
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [tonnage, setTonnage] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [postcodeReady, setPostcodeReady] = useState(false);
  const [route, setRoute] = useState<RouteEstimate | null>(null);
  const [calculating, startCalculating] = useTransition();
  // 마지막으로 거리를 구한 주소 조합 (같은 주소로 다시 계산하지 않도록)
  const lastRouteKey = useRef("");

  // 두 주소가 다 있으면 도로 거리를 구합니다.
  function calculateRoute(nextOrigin: string, nextDestination: string) {
    const from = nextOrigin.trim();
    const to = nextDestination.trim();
    if (!from || !to) {
      lastRouteKey.current = "";
      setRoute(null);
      return;
    }
    const key = `${from}|${to}`;
    if (key === lastRouteKey.current) return;
    lastRouteKey.current = key;
    startCalculating(async () => {
      const result = await estimateRoute(from, to);
      // 계산 중에 주소가 또 바뀌었으면 이전 결과는 버립니다.
      if (lastRouteKey.current === key) setRoute(result);
    });
  }

  if (state.status === "success") {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-blue-100 bg-blue-50 px-8 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-950 text-white">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="h-7 w-7"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h3 className="mt-6 text-xl font-bold text-slate-900">
          견적 문의가 접수되었습니다
        </h3>
        <p className="mt-2 max-w-sm text-sm text-slate-600">{state.message}</p>
        <button
          type="button"
          onClick={onSubmitAnother}
          className="mt-8 rounded-full border border-blue-950 px-6 py-2.5 text-sm font-semibold text-blue-950 transition-colors hover:bg-blue-950 hover:text-white"
        >
          추가 문의 작성하기
        </button>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="grid grid-cols-1 gap-5 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:grid-cols-2"
    >
      <Script src={POSTCODE_SCRIPT} strategy="lazyOnload" onReady={() => setPostcodeReady(true)} />

      <AddressField
        id="origin"
        label="상차지"
        placeholder="예: 경남 창원시 성산구 중앙대로 151"
        value={origin}
        error={fieldErrors.origin}
        postcodeReady={postcodeReady}
        onChange={setOrigin}
        onCommit={(value) => calculateRoute(value, destination)}
      />
      <AddressField
        id="destination"
        label="하차지"
        placeholder="예: 부산 강서구 녹산산단로 1"
        value={destination}
        error={fieldErrors.destination}
        postcodeReady={postcodeReady}
        onChange={setDestination}
        onCommit={(value) => calculateRoute(origin, value)}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="tonnage" className="text-sm font-medium text-slate-700">
          화물 톤수
        </label>
        <select
          id="tonnage"
          name="tonnage"
          value={tonnage}
          onChange={(event) => setTonnage(event.target.value)}
          aria-invalid={Boolean(fieldErrors.tonnage)}
          className={`${inputClass} bg-white`}
        >
          <option value="">톤수를 선택해 주세요</option>
          {TONNAGE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {fieldErrors.tonnage && (
          <p className="text-xs font-medium text-red-600">{fieldErrors.tonnage}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="vehicleType"
          className="text-sm font-medium text-slate-700"
        >
          차종
        </label>
        <select
          id="vehicleType"
          name="vehicleType"
          value={vehicleType}
          onChange={(event) => setVehicleType(event.target.value)}
          aria-invalid={Boolean(fieldErrors.vehicleType)}
          className={`${inputClass} bg-white`}
        >
          <option value="">차종을 선택해 주세요</option>
          {VEHICLE_TYPES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {fieldErrors.vehicleType && (
          <p className="text-xs font-medium text-red-600">
            {fieldErrors.vehicleType}
          </p>
        )}
      </div>

      <EstimateBox calculating={calculating} route={route} tonnage={tonnage} />

      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <label htmlFor="contact" className="text-sm font-medium text-slate-700">
          연락처
        </label>
        <input
          id="contact"
          name="contact"
          type="tel"
          placeholder="예: 010-1234-5678"
          defaultValue=""
          aria-invalid={Boolean(fieldErrors.contact)}
          className={inputClass}
        />
        {fieldErrors.contact && (
          <p className="text-xs font-medium text-red-600">{fieldErrors.contact}</p>
        )}
      </div>

      {state.status === "error" && Object.keys(fieldErrors).length === 0 && (
        <p role="alert" className="text-sm font-medium text-red-600 sm:col-span-2">
          {state.message}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}

function AddressField({
  id,
  label,
  placeholder,
  value,
  error,
  postcodeReady,
  onChange,
  onCommit,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  error?: string;
  postcodeReady: boolean;
  onChange: (value: string) => void;
  /** 주소가 확정됐을 때 (주소 찾기에서 선택 / 직접 입력 후 칸을 벗어남) */
  onCommit: (value: string) => void;
}) {
  function openPostcode() {
    if (!window.daum?.Postcode) return;
    new window.daum.Postcode({
      oncomplete(data) {
        const address = data.roadAddress || data.jibunAddress || data.address;
        onChange(address);
        onCommit(address);
      },
    }).open();
  }

  // 주소는 길어서 한 줄을 다 씁니다.
  return (
    <div className="flex flex-col gap-1.5 sm:col-span-2">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          name={id}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={(event) => onCommit(event.target.value)}
          aria-invalid={Boolean(error)}
          className={`${inputClass} min-w-0 flex-1`}
        />
        <button
          type="button"
          onClick={openPostcode}
          disabled={!postcodeReady}
          className="shrink-0 rounded-lg border border-blue-950 px-3 text-sm font-semibold text-blue-950 transition-colors hover:bg-blue-950 hover:text-white disabled:cursor-wait disabled:opacity-50"
        >
          주소 찾기
        </button>
      </div>
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}

const won = new Intl.NumberFormat("ko-KR");

function EstimateBox({
  calculating,
  route,
  tonnage,
}: {
  calculating: boolean;
  route: RouteEstimate | null;
  tonnage: string;
}) {
  let body: React.ReactNode;
  if (calculating) {
    body = <p className="text-sm text-slate-600">거리를 계산하고 있습니다...</p>;
  } else if (!route) {
    body = (
      <p className="text-sm text-slate-500">
        상차지와 하차지를 입력하면 거리와 예상 운임이 자동으로 계산됩니다.
      </p>
    );
  } else if (!route.ok) {
    body = <p className="text-sm font-medium text-red-600">{route.message}</p>;
  } else {
    const fare = tonnage ? (route.fares[tonnage] ?? null) : null;
    const hours = Math.floor(route.minutes / 60);
    const minutes = route.minutes % 60;
    body = (
      <>
        <dl className="grid grid-cols-3 gap-4 text-center">
          <div>
            <dt className="text-xs text-slate-500">운행 거리</dt>
            <dd className="mt-1 text-lg font-bold text-slate-900">
              {route.km.toLocaleString("ko-KR")} km
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">예상 소요 시간</dt>
            <dd className="mt-1 text-lg font-bold text-slate-900">
              {hours > 0 ? `${hours}시간 ` : ""}
              {minutes}분
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">예상 운임</dt>
            <dd className="mt-1 text-lg font-bold text-blue-900">
              {!tonnage ? "톤수 선택" : fare === null ? "별도 상담" : `${won.format(fare)}원`}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-slate-500">
          실제 도로 거리 기준 예상 금액이며, 화물·상하차 조건에 따라 달라질 수 있습니다.
        </p>
      </>
    );
  }

  return (
    <div
      aria-live="polite"
      className="rounded-xl border border-blue-100 bg-blue-50/60 px-5 py-4 sm:col-span-2"
    >
      {body}
    </div>
  );
}
