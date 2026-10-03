"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import {
  createDispatchRecord,
  type DispatchFormState,
} from "@/app/actions/dispatch";
import { COMPANY_OPTIONS } from "@/app/lib/dispatch-options";

type TripErrors = NonNullable<DispatchFormState["fieldErrors"]>;
type ItemErrors = NonNullable<DispatchFormState["itemErrors"]>[number];

const initialState: DispatchFormState = { status: "idle", message: "" };

const inputClass =
  "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 aria-invalid:border-red-400 aria-invalid:bg-red-50/40";

const DEFAULT_ORIGIN = "창원공동물류센터";

/**
 * 신규 등록: 회사 줄은 여러 개(합적), 배차 정보(날짜·기사·차량·지급금액)는 한 번.
 * 등록에 성공하면 폼을 새로 그리면서 날짜와 첫 줄 회사구분만 남깁니다.
 */
export default function DispatchEntryForm({ today }: { today: string }) {
  const [state, formAction, pending] = useActionState(createDispatchRecord, initialState);

  // form action 대신 onSubmit을 써서, 검증 실패 시 React가 입력값을 초기화하지 않도록 합니다.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  const isSuccess = state.status === "success";

  return (
    <form
      // 등록 성공마다 key가 바뀌어 입력칸이 기본값으로 돌아갑니다.
      key={state.savedAt ?? 0}
      onSubmit={handleSubmit}
      className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white"
    >
      <EntryFields
        today={state.keep?.dispatchDate || today}
        defaultCompany={state.keep?.company ?? ""}
        focusFirstLine={isSuccess}
        tripErrors={isSuccess ? {} : (state.fieldErrors ?? {})}
        itemErrors={isSuccess ? [] : (state.itemErrors ?? [])}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/60 px-5 py-4">
        <p
          role="status"
          className={`text-sm ${
            state.status === "error"
              ? "text-red-600"
              : isSuccess
                ? "text-emerald-700"
                : "text-slate-400"
          }`}
        >
          {state.message || (
            <>
              <span className="text-red-500">*</span> 표시는 필수 항목입니다. 한 차에 여러 회사 짐을
              실었으면 &lsquo;회사 추가 (합적)&rsquo;로 줄을 늘리세요.
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

function EntryFields({
  today,
  defaultCompany,
  focusFirstLine,
  tripErrors,
  itemErrors,
}: {
  today: string;
  defaultCompany: string;
  focusFirstLine: boolean;
  tripErrors: TripErrors;
  itemErrors: ItemErrors[];
}) {
  const nextKey = useRef(1);
  const [lines, setLines] = useState<number[]>([0]);

  const addLine = () => setLines((prev) => [...prev, nextKey.current++]);
  const removeLine = (key: number) => setLines((prev) => prev.filter((k) => k !== key));

  return (
    <>
      <Group title="회사별 청구" hint="합적이면 줄 추가">
        <div className="space-y-3">
          {lines.map((key, index) => (
            <ItemLine
              key={key}
              lineKey={key}
              showLabelsOnWide={index === 0}
              defaultCompany={index === 0 ? defaultCompany : ""}
              autoFocus={focusFirstLine && index === 0}
              errors={itemErrors[index] ?? {}}
              onRemove={lines.length > 1 ? () => removeLine(key) : undefined}
            />
          ))}
          <button
            type="button"
            onClick={addLine}
            className="rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm text-slate-600 transition-colors hover:border-blue-900 hover:text-blue-900"
          >
            + 회사 추가 (합적)
          </button>
        </div>
      </Group>

      <Group title="배차 정보">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <Field htmlFor="dispatchDate" label="날짜" required error={tripErrors.dispatchDate}>
            <input
              id="dispatchDate"
              name="dispatchDate"
              type="date"
              defaultValue={today}
              aria-invalid={Boolean(tripErrors.dispatchDate)}
              className={inputClass}
            />
          </Field>
          <Field htmlFor="driver" label="기사" error={tripErrors.driver}>
            <input
              id="driver"
              name="driver"
              type="text"
              placeholder="기사명"
              aria-invalid={Boolean(tripErrors.driver)}
              className={inputClass}
            />
          </Field>
          <Field htmlFor="driverPhone" label="기사 전화번호" error={tripErrors.driverPhone}>
            <input
              id="driverPhone"
              name="driverPhone"
              type="tel"
              placeholder="010-1234-5678"
              aria-invalid={Boolean(tripErrors.driverPhone)}
              className={inputClass}
            />
          </Field>
          <Field htmlFor="vehicleNumber" label="차량번호" error={tripErrors.vehicleNumber}>
            <input
              id="vehicleNumber"
              name="vehicleNumber"
              type="text"
              placeholder="예: 경남81아2637"
              aria-invalid={Boolean(tripErrors.vehicleNumber)}
              className={inputClass}
            />
          </Field>
          <Field htmlFor="driverPay" label="지급금액" error={tripErrors.driverPay}>
            <MoneyInput id="driverPay" name="driverPay" invalid={Boolean(tripErrors.driverPay)} />
          </Field>
        </div>
      </Group>
    </>
  );
}

function ItemLine({
  lineKey,
  showLabelsOnWide,
  defaultCompany,
  autoFocus,
  errors,
  onRemove,
}: {
  lineKey: number;
  showLabelsOnWide: boolean;
  defaultCompany: string;
  autoFocus: boolean;
  errors: ItemErrors;
  onRemove?: () => void;
}) {
  const id = (field: string) => `item_${field}_${lineKey}`;
  // 넓은 화면에서는 첫 줄에만 칸 이름을 보여줍니다.
  const labelClass = showLabelsOnWide ? "" : "lg:sr-only";

  return (
    <div className="grid grid-cols-2 items-start gap-3 lg:grid-cols-[1fr_1.2fr_1.2fr_0.6fr_1fr_1.4fr_2rem]">
      <Field htmlFor={id("company")} label="회사구분" required error={errors.company} labelClass={labelClass}>
        <select
          id={id("company")}
          name="item_company"
          defaultValue={defaultCompany}
          aria-invalid={Boolean(errors.company)}
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
      <Field htmlFor={id("origin")} label="상차지" required error={errors.origin} labelClass={labelClass}>
        <input
          id={id("origin")}
          name="item_origin"
          type="text"
          defaultValue={DEFAULT_ORIGIN}
          aria-invalid={Boolean(errors.origin)}
          className={inputClass}
        />
      </Field>
      <Field htmlFor={id("destination")} label="하차지" required error={errors.destination} labelClass={labelClass}>
        <input
          id={id("destination")}
          name="item_destination"
          type="text"
          autoFocus={autoFocus}
          placeholder="예: 부산 강서구"
          aria-invalid={Boolean(errors.destination)}
          className={inputClass}
        />
      </Field>
      <Field htmlFor={id("tonnage")} label="톤수" error={errors.tonnage} labelClass={labelClass}>
        <input
          id={id("tonnage")}
          name="item_tonnage"
          type="text"
          autoComplete="off"
          placeholder="5톤"
          aria-invalid={Boolean(errors.tonnage)}
          className={inputClass}
        />
      </Field>
      <Field htmlFor={id("amount")} label="청구금액" required error={errors.amount} labelClass={labelClass}>
        <MoneyInput id={id("amount")} name="item_amount" invalid={Boolean(errors.amount)} />
      </Field>
      <Field htmlFor={id("memo")} label="비고" error={errors.memo} labelClass={labelClass}>
        <input
          id={id("memo")}
          name="item_memo"
          type="text"
          placeholder="예: 파렛 회수"
          aria-invalid={Boolean(errors.memo)}
          className={inputClass}
        />
      </Field>
      <div className={`flex h-full items-end ${showLabelsOnWide ? "lg:pt-6" : ""}`}>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label="이 회사 줄 삭제"
            title="이 회사 줄 삭제"
            className="flex h-10 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

function MoneyInput({ id, name, invalid }: { id: string; name: string; invalid: boolean }) {
  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type="text"
        inputMode="numeric"
        placeholder="0"
        aria-invalid={invalid}
        className={`${inputClass} pr-8 text-right tabular-nums`}
      />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-400">
        원
      </span>
    </div>
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
  htmlFor,
  label,
  required = false,
  error,
  labelClass = "",
  children,
}: {
  htmlFor: string;
  label: string;
  required?: boolean;
  error?: string;
  labelClass?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={htmlFor} className={`text-xs font-medium text-slate-600 ${labelClass}`}>
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
