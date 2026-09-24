"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { isAuthorizedHeader } from "@/app/lib/admin-auth";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";

type DispatchField =
  | "dispatchDate"
  | "company"
  | "origin"
  | "destination"
  | "tonnage"
  | "driver"
  | "amount";

export type DispatchFormState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: Partial<Record<DispatchField, string>>;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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

  const dispatchDate = String(formData.get("dispatchDate") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim();
  const origin = String(formData.get("origin") ?? "").trim();
  const destination = String(formData.get("destination") ?? "").trim();
  const tonnage = String(formData.get("tonnage") ?? "").trim();
  const driver = String(formData.get("driver") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "").replace(/[,\s원]/g, "");

  const fieldErrors: DispatchFormState["fieldErrors"] = {};
  if (!DATE_PATTERN.test(dispatchDate)) fieldErrors.dispatchDate = "날짜를 입력해 주세요.";
  if (!company) fieldErrors.company = "회사구분을 입력해 주세요.";
  if (!origin) fieldErrors.origin = "상차지를 입력해 주세요.";
  if (!destination) fieldErrors.destination = "하차지를 입력해 주세요.";
  if (!tonnage) fieldErrors.tonnage = "톤수를 입력해 주세요.";
  if (!driver) fieldErrors.driver = "기사를 입력해 주세요.";
  if (!/^\d+$/.test(amountRaw)) fieldErrors.amount = "금액을 숫자로 입력해 주세요.";

  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", message: "입력 내용을 확인해 주세요.", fieldErrors };
  }

  const { error } = await createSupabaseAdminClient()
    .from("dispatch_records")
    .insert({
      dispatch_date: dispatchDate,
      company,
      origin,
      destination,
      tonnage,
      driver,
      amount: Number(amountRaw),
    });

  if (error) {
    console.error("Supabase dispatch_records insert failed", error);
    return { status: "error", message: "저장 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요." };
  }

  revalidatePath("/admin/dispatch");
  return { status: "success", message: "등록되었습니다." };
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
