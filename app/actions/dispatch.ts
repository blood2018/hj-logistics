"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { isAuthorizedHeader } from "@/app/lib/admin-auth";
import { COMPANY_OPTIONS, normalizeTonnage } from "@/app/lib/dispatch-options";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";

type DispatchField =
  | "dispatchDate"
  | "company"
  | "origin"
  | "destination"
  | "tonnage"
  | "driver"
  | "driverPhone"
  | "vehicleNumber"
  | "amount";

export type DispatchFormState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: Partial<Record<DispatchField, string>>;
};

export type DispatchColumn =
  | "dispatch_date"
  | "company"
  | "origin"
  | "destination"
  | "tonnage"
  | "driver"
  | "driver_phone"
  | "vehicle_number"
  | "amount";

export type UpdateResult = { ok: true } | { ok: false; message: string };

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const PHONE_PATTERN = /^[0-9-]{9,13}$/;

type ParseResult = { value: string | number } | { error: string };

// 입력 폼 필드명 → DB 컬럼과 검증 규칙. 등록과 셀 수정이 같은 규칙을 씁니다.
const FIELD_RULES: Record<
  DispatchField,
  { column: DispatchColumn; parse: (raw: string) => ParseResult }
> = {
  dispatchDate: {
    column: "dispatch_date",
    parse: (raw) => (DATE_PATTERN.test(raw) ? { value: raw } : { error: "날짜를 입력해 주세요." }),
  },
  company: {
    column: "company",
    parse: (raw) =>
      COMPANY_OPTIONS.includes(raw) ? { value: raw } : { error: "회사구분을 선택해 주세요." },
  },
  origin: {
    column: "origin",
    parse: (raw) => (raw ? { value: raw } : { error: "상차지를 입력해 주세요." }),
  },
  destination: {
    column: "destination",
    parse: (raw) => (raw ? { value: raw } : { error: "하차지를 입력해 주세요." }),
  },
  tonnage: {
    column: "tonnage",
    parse: (raw) =>
      normalizeTonnage(raw) ? { value: normalizeTonnage(raw) } : { error: "톤수를 입력해 주세요." },
  },
  driver: {
    column: "driver",
    parse: (raw) => ({ value: raw }), // 선택 입력
  },
  driverPhone: {
    column: "driver_phone",
    // 선택 입력이지만, 입력했다면 형식을 확인합니다.
    parse: (raw) =>
      !raw || PHONE_PATTERN.test(raw)
        ? { value: raw }
        : { error: "전화번호를 올바르게 입력해 주세요. (예: 010-1234-5678)" },
  },
  vehicleNumber: {
    column: "vehicle_number",
    parse: (raw) => ({ value: raw }), // 선택 입력
  },
  amount: {
    column: "amount",
    parse: (raw) => {
      const digits = raw.replace(/[,\s원]/g, "");
      return /^\d+$/.test(digits)
        ? { value: Number(digits) }
        : { error: "청구금액을 숫자로 입력해 주세요." };
    },
  },
};

// Server Action은 어떤 경로로든 POST 호출될 수 있어 proxy.ts의 /admin 매처만으로는 보호되지 않습니다.
async function assertAdmin() {
  const headerList = await headers();
  if (!isAuthorizedHeader(headerList.get("authorization"))) {
    throw new Error("Unauthorized");
  }
}

export async function createDispatchRecord(
  _prevState: DispatchFormState,
  formData: FormData
): Promise<DispatchFormState> {
  await assertAdmin();

  const record: Partial<Record<DispatchColumn, string | number>> = {};
  const fieldErrors: DispatchFormState["fieldErrors"] = {};

  for (const [field, rule] of Object.entries(FIELD_RULES) as [
    DispatchField,
    (typeof FIELD_RULES)[DispatchField],
  ][]) {
    const result = rule.parse(String(formData.get(field) ?? "").trim());
    if ("error" in result) fieldErrors[field] = result.error;
    else record[rule.column] = result.value;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", message: "입력 내용을 확인해 주세요.", fieldErrors };
  }

  const { error } = await createSupabaseAdminClient()
    .from("dispatch_records")
    .insert(record);

  if (error) {
    console.error("Supabase dispatch_records insert failed", error);
    return { status: "error", message: "저장 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요." };
  }

  revalidatePath("/admin/dispatch");
  return { status: "success", message: "등록되었습니다." };
}

/** 조회 표에서 셀 하나를 더블클릭해 수정할 때 호출됩니다. */
export async function updateDispatchField(
  id: string,
  column: DispatchColumn,
  rawValue: string
): Promise<UpdateResult> {
  await assertAdmin();

  const rule = Object.values(FIELD_RULES).find((r) => r.column === column);
  if (!id || !rule) return { ok: false, message: "잘못된 요청입니다." };

  const result = rule.parse(rawValue.trim());
  if ("error" in result) return { ok: false, message: result.error };

  const { error } = await createSupabaseAdminClient()
    .from("dispatch_records")
    .update({ [column]: result.value })
    .eq("id", id);

  if (error) {
    console.error("Supabase dispatch_records update failed", error);
    return { ok: false, message: "저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }

  revalidatePath("/admin/dispatch");
  return { ok: true };
}

export async function deleteDispatchRecord(formData: FormData) {
  await assertAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const { error } = await createSupabaseAdminClient()
    .from("dispatch_records")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Supabase dispatch_records delete failed", error);
    throw new Error("삭제하지 못했습니다.");
  }

  revalidatePath("/admin/dispatch");
}
