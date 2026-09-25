"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import {
  createDispatchRecord,
  type DispatchFormState,
} from "@/app/actions/dispatch";
import { COMPANY_OPTIONS } from "@/app/lib/dispatch-options";

type FieldName = keyof NonNullable<DispatchFormState["fieldErrors"]>;

const initialState: DispatchFormState = { status: "idle", message: "" };

const inputClass =
  "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 aria-invalid:border-red-400 aria-invalid:bg-red-50/40";

// 연속 입력 시 날짜·회사구분은 그대로 두고 나머지만 비웁니다.
const RESET_FIELDS = [
  "tonnage",
  "amount",
  "origin",
  "destination",
  "driver",
  "driverPhone",
  "vehicleNumber",
];

export default function DispatchEntryForm({ today }: { today: string }) {
  const [state, formAction, pending] = useActionState(
    createDispatchRecord,
    initialState
  );
  const formRef = useRef<HTMLFormElement>(null);
  const fieldErrors = state.fieldErrors ?? {};

  useEffect(() => {
    const form = formRef.current;
    if (state.status !== "success" || !form) return;
    for (const name of RESET_FIELDS) {
      const input = form.elements.namedItem(name);
      if (input instanceof HTMLInputElement || input instanceof HTMLSelectElement) {
        input.value = "";
      }
    }
    (form.elements.namedItem("tonnage") as HTMLInputElement | null)?.focus();
  }, [state]);

  // form action 대신 onSubmit을 써서, 검증 실패 시 React가 입력값을 초기화하지 않도록 합니다.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  const invalid = (name: FieldName) => Boolean(fieldErrors[name]);

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white"
    >
      <Group title="운송 정보">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Field name="dispatchDate" label="날짜" required error={fieldErrors.dispatchDate}>
            <input
              id="dispatchDate"
              name="dispatchDate"
              type="date"
              defaultValue={today}
              aria-invalid={invalid("dispatchDate")}
              className={inputClass}
            />
          </Field>
          <Field name="company" label="회사구분" required error={fieldErrors.company}>
            <select
              id="company"
              name="company"
              defaultValue=""
              aria-invalid={invalid("company")}
              className={inputClass}
            >
              <option value="">선택하세요</option>
              {COMPANY_OPTIONS.map((company) => (
                <option key={company} value={company}>
                  {company}
                </option>
              ))}
            </select>
          </Field>
          <Field name="tonnage" label="톤수" required error={fieldErrors.tonnage}>
            <input
              id="tonnage"
              name="tonnage"
              type="text"
              autoComplete="off"
              placeholder="예: 5톤"
              aria-invalid={invalid("tonnage")}
              className={inputClass}
            />
          </Field>
          <Field name="amount" label="금액" required error={fieldErrors.amount}>
            <div className="relative">
              <input
                id="amount"
                name="amount"
                type="text"
                inputMode="numeric"
                placeholder="350,000"
                aria-invalid={invalid("amount")}
                className={`${inputClass} pr-8 text-right tabular-nums`}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-400">
                원
              </span>
            </div>
          </Field>
        </div>
      </Group>

      <Group title="경로">
        <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-[1fr_auto_1fr]">
          <Field name="origin" label="상차지" required error={fieldErrors.origin}>
            <input
              id="origin"
              name="origin"
              type="text"
              placeholder="예: 창원 성산구"
              aria-invalid={invalid("origin")}
              className={inputClass}
            />
          </Field>
          <span
            aria-hidden
            className="hidden h-10 items-center self-end text-lg text-slate-300 sm:flex"
          >
            →
          </span>
          <Field name="destination" label="하차지" required error={fieldErrors.destination}>
            <input
              id="destination"
              name="destination"
              type="text"
              placeholder="예: 부산 강서구"
              aria-invalid={invalid("destination")}
              className={inputClass}
            />
          </Field>
        </div>
      </Group>

      <Group title="기사 정보" hint="선택 입력">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field name="driver" label="기사" error={fieldErrors.driver}>
            <input
              id="driver"
              name="driver"
              type="text"
              placeholder="기사명"
              aria-invalid={invalid("driver")}
              className={inputClass}
            />
          </Field>
          <Field name="driverPhone" label="기사 전화번호" error={fieldErrors.driverPhone}>
            <input
              id="driverPhone"
              name="driverPhone"
              type="tel"
              placeholder="010-1234-5678"
              aria-invalid={invalid("driverPhone")}
              className={inputClass}
            />
          </Field>
          <Field name="vehicleNumber" label="차량번호" error={fieldErrors.vehicleNumber}>
            <input
              id="vehicleNumber"
              name="vehicleNumber"
              type="text"
              placeholder="예: 경남81아2637"
              aria-invalid={invalid("vehicleNumber")}
              className={inputClass}
            />
          </Field>
        </div>
      </Group>

      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/60 px-5 py-4">
        <p
          role="status"
          className={`text-sm ${
            state.status === "error"
              ? "text-red-600"
              : state.status === "success"
                ? "text-emerald-700"
                : "text-slate-400"
          }`}
        >
          {state.message || (
            <>
              <span className="text-red-500">*</span> 표시는 필수 항목입니다. 등록 후 날짜와
              회사구분은 유지됩니다.
            </>
          )}
        </p>
        <button
          type="submit"
          disabled={pending}
          className="h-10 rounded-lg bg-blue-950 px-8 text-sm font-semibold text-white transition-colors hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "저장 중..." : "등록"}
        </button>
      </div>
    </form>
  );
}

function Group({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="grid min-w-0 gap-3 px-5 py-4 lg:grid-cols-[96px_1fr] lg:gap-6">
      <legend className="sr-only">{title}</legend>
      <div className="lg:pt-7">
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        {hint && <p className="text-xs text-slate-400">{hint}</p>}
      </div>
      {children}
    </fieldset>
  );
}

function Field({
  name,
  label,
  required = false,
  error,
  children,
}: {
  name: FieldName;
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={name} className="text-xs font-medium text-slate-600">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
