"use client";

import { useRef, useState, useTransition } from "react";
import {
  updateDispatchField,
  type DispatchColumn,
} from "@/app/actions/dispatch";

type EditableCellProps = {
  id: string;
  column: DispatchColumn;
  value: string;
  /** 보기 모드에서 표시할 값 (예: 금액 천 단위 쉼표). 없으면 value를 그대로 표시합니다. */
  display?: string;
  input?: "text" | "date" | "tel" | "number" | "select";
  options?: string[];
  className?: string;
};

const fieldClass =
  "w-full min-w-0 rounded border border-blue-500 bg-white px-2 py-1 text-sm text-slate-900 outline-none ring-2 ring-blue-100";

/** 더블클릭하면 입력칸으로 바뀌고, Enter/포커스 이탈 시 저장, Esc로 취소합니다. */
export default function EditableCell({
  id,
  column,
  value,
  display,
  input = "text",
  options = [],
  className = "",
}: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const savingRef = useRef(false);

  function startEditing() {
    setDraft(value);
    setError(null);
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
    setError(null);
  }

  function save(next: string) {
    if (savingRef.current) return;
    if (next.trim() === value) {
      cancel();
      return;
    }

    savingRef.current = true;
    startTransition(async () => {
      const result = await updateDispatchField(id, column, next);
      savingRef.current = false;
      if (result.ok) {
        setEditing(false);
        setError(null);
      } else {
        setError(result.message);
      }
    });
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Enter") {
      event.preventDefault();
      save(draft);
    } else if (event.key === "Escape") {
      cancel();
    }
  }

  if (!editing) {
    return (
      <td
        onDoubleClick={startEditing}
        title="더블클릭하여 수정"
        className={`cursor-pointer select-none px-4 py-3 hover:bg-blue-50 ${className}`}
      >
        {display ?? value}
      </td>
    );
  }

  return (
    <td className={`px-2 py-2 align-top ${pending ? "opacity-60" : ""}`}>
      {input === "select" ? (
        <select
          autoFocus
          value={draft}
          disabled={pending}
          onChange={(event) => {
            setDraft(event.target.value);
            save(event.target.value);
          }}
          onBlur={() => !pending && cancel()}
          onKeyDown={handleKeyDown}
          className={fieldClass}
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          autoFocus
          type={input === "number" ? "text" : input}
          inputMode={input === "number" ? "numeric" : undefined}
          value={draft}
          disabled={pending}
          onChange={(event) => setDraft(event.target.value)}
          onFocus={(event) => input !== "date" && event.target.select()}
          onBlur={() => save(draft)}
          onKeyDown={handleKeyDown}
          className={`${fieldClass} ${input === "number" ? "text-right" : ""}`}
        />
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </td>
  );
}
