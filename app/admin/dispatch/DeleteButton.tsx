"use client";

import { deleteDispatchRecord } from "@/app/actions/dispatch";

export default function DeleteButton({ id }: { id: string }) {
  return (
    <form
      action={deleteDispatchRecord}
      onSubmit={(event) => {
        if (!window.confirm("이 기록을 삭제할까요?")) event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="text-xs text-slate-400 transition-colors hover:text-red-600"
      >
        삭제
      </button>
    </form>
  );
}
