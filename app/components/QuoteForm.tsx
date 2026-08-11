"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  submitQuoteRequest,
  type QuoteFormState,
} from "@/app/actions/quote-request";

const TONNAGE_OPTIONS = [
  "1톤",
  "1.4톤",
  "2.5톤",
  "3.5톤",
  "5톤",
  "8톤",
  "11톤",
  "15톤",
  "18톤",
  "25톤",
  "특수 화물",
];

const VEHICLE_TYPES = [
  "카고",
  "윙바디",
  "냉동/냉장",
  "탑차",
  "리프트",
  "특수차량(크레인 등)",
];

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
      <div className="flex flex-col gap-1.5">
        <label htmlFor="origin" className="text-sm font-medium text-slate-700">
          출발지
        </label>
        <input
          id="origin"
          name="origin"
          type="text"
          placeholder="예: 경기도 이천시"
          defaultValue=""
          aria-invalid={Boolean(fieldErrors.origin)}
          className={inputClass}
        />
        {fieldErrors.origin && (
          <p className="text-xs font-medium text-red-600">{fieldErrors.origin}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="destination"
          className="text-sm font-medium text-slate-700"
        >
          도착지
        </label>
        <input
          id="destination"
          name="destination"
          type="text"
          placeholder="예: 부산광역시 강서구"
          defaultValue=""
          aria-invalid={Boolean(fieldErrors.destination)}
          className={inputClass}
        />
        {fieldErrors.destination && (
          <p className="text-xs font-medium text-red-600">
            {fieldErrors.destination}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="tonnage" className="text-sm font-medium text-slate-700">
          화물 톤수
        </label>
        <select
          id="tonnage"
          name="tonnage"
          defaultValue=""
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
          defaultValue=""
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
