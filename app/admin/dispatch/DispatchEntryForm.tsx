"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import {
  createDispatchRecord,
  type DispatchFormState,
} from "@/app/actions/dispatch";

const initialState: DispatchFormState = { status: "idle", message: "" };

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 aria-invalid:border-red-400";

// 연속 입력 시 날짜·회사구분은 그대로 두고 나머지만 비웁니다.
const RESET_FIELDS = ["origin", "destination", "tonnage", "driver", "amount"];

export default function DispatchEntryForm({
  companies,
  tonnageOptions,
  today,
}: {
  companies: string[];
  tonnageOptions: string[];
  today: string;
}) {
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
      if (input instanceof HTMLInputElement) input.value = "";
    }
    (form.elements.namedItem("origin") as HTMLInputElement | null)?.focus();
  }, [state]);

  // form action 대신 onSubmit을 써서, 검증 실패 시 React가 입력값을 초기화하지 않도록 합니다.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  const fields: {
    name: keyof NonNullable<DispatchFormState["fieldErrors"]>;
    label: string;
    render: (invalid: boolean) => React.ReactNode;
  }[] = [
    {
      name: "dispatchDate",
      label: "날짜",
      render: (invalid) => (
        <input
          id="dispatchDate"
          name="dispatchDate"
          type="date"
          defaultValue={today}
          aria-invalid={invalid}
          className={inputClass}
        />
      ),
    },
    {
      name: "company",
      label: "회사구분",
      render: (invalid) => (
        <input
          id="company"
          name="company"
          type="text"
          list="company-options"
          autoComplete="off"
          placeholder="회사명"
          aria-invalid={invalid}
          className={inputClass}
        />
      ),
    },
    {
      name: "origin",
      label: "상차지",
      render: (invalid) => (
        <input
          id="origin"
          name="origin"
          type="text"
          placeholder="예: 창원 성산구"
          aria-invalid={invalid}
          className={inputClass}
        />
      ),
    },
    {
      name: "destination",
      label: "하차지",
      render: (invalid) => (
        <input
          id="destination"
          name="destination"
          type="text"
          placeholder="예: 부산 강서구"
          aria-invalid={invalid}
          className={inputClass}
        />
      ),
    },
    {
      name: "tonnage",
      label: "톤수",
      render: (invalid) => (
        <input
          id="tonnage"
          name="tonnage"
          type="text"
          list="tonnage-options"
          autoComplete="off"
          placeholder="예: 5톤"
          aria-invalid={invalid}
          className={inputClass}
        />
      ),
    },
    {
      name: "driver",
      label: "기사",
      render: (invalid) => (
        <input
          id="driver"
          name="driver"
          type="text"
          placeholder="기사명"
          aria-invalid={invalid}
          className={inputClass}
        />
      ),
    },
    {
      name: "amount",
      label: "금액(원)",
      render: (invalid) => (
        <input
          id="amount"
          name="amount"
          type="text"
          inputMode="numeric"
          placeholder="예: 350000"
          aria-invalid={invalid}
          className={`${inputClass} text-right`}
        />
      ),
    },
  ];

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="rounded-xl border border-slate-200 bg-white p-5"
    >
      <datalist id="company-options">
        {companies.map((company) => (
          <option key={company} value={company} />
        ))}
      </datalist>
      <datalist id="tonnage-options">
        {tonnageOptions.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
        {fields.map(({ name, label, render }) => (
          <div key={name} className="flex flex-col gap-1">
            <label htmlFor={name} className="text-xs font-medium text-slate-600">
              {label}
            </label>
            {render(Boolean(fieldErrors[name]))}
            {fieldErrors[name] && (
              <p className="text-xs text-red-600">{fieldErrors[name]}</p>
            )}
          </div>
        ))}

        <div className="flex flex-col justify-end gap-1">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-blue-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "저장 중..." : "등록"}
          </button>
        </div>
      </div>

      {state.message && (
        <p
          role="status"
          className={`mt-3 text-sm ${
            state.status === "error" ? "text-red-600" : "text-emerald-700"
          }`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
