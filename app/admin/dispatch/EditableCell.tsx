"use client";

import { useRef, useState, useTransition } from "react";
import {
  updateDispatchField,
  type DispatchColumn,
} from "@/app/actions/dispatch";

type EditableCellProps = {
  /** 고칠 줄 id. 합쳐진 칸이면 여러 줄 id를 함께 넘깁니다. */
  id: string | string[];
  column: DispatchColumn;
  value: string;
  /** 보기 모드에서 표시할 내용 (예: 금액 천 단위 쉼표). 없으면 value를 그대로 표시합니다. */
  display?: React.ReactNode;
  /** 마우스를 올렸을 때 보여줄 글 (예: 말줄임된 비고 전체). 없으면 수정 안내 문구 */
  title?: string;
  /** 여러 줄에 걸친 셀 (합적 배차 칸을 엑셀 셀 병합처럼 보여줄 때) */
  rowSpan?: number;
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
  title,
  rowSpan,
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
        rowSpan={rowSpan}
        onDoubleClick={startEditing}
        title={title || "더블클릭하여 수정"}
        className={`cursor-pointer select-none px-3 py-3 hover:bg-blue-50 ${className}`}
      >
        {display ?? value}
      </td>
    );
  }

  return (
    <td rowSpan={rowSpan} className={`px-2 py-2 align-top ${pending ? "opacity-60" : ""}`}>
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
