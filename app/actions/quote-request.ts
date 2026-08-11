"use server";

import { createSupabaseServerClient } from "@/app/lib/supabase/server";

type QuoteField = "origin" | "destination" | "tonnage" | "vehicleType" | "contact";

export type QuoteFormState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: Partial<Record<QuoteField, string>>;
};

const PHONE_PATTERN = /^[0-9-]{9,13}$/;

export async function submitQuoteRequest(
  _prevState: QuoteFormState,
  formData: FormData
): Promise<QuoteFormState> {
  const origin = String(formData.get("origin") ?? "").trim();
  const destination = String(formData.get("destination") ?? "").trim();
  const tonnage = String(formData.get("tonnage") ?? "").trim();
  const vehicleType = String(formData.get("vehicleType") ?? "").trim();
  const contact = String(formData.get("contact") ?? "").trim();

  const fieldErrors: QuoteFormState["fieldErrors"] = {};
  if (!origin) fieldErrors.origin = "출발지를 입력해 주세요.";
  if (!destination) fieldErrors.destination = "도착지를 입력해 주세요.";
  if (!tonnage) fieldErrors.tonnage = "화물 톤수를 선택해 주세요.";
  if (!vehicleType) fieldErrors.vehicleType = "차종을 선택해 주세요.";
  if (!contact) {
    fieldErrors.contact = "연락처를 입력해 주세요.";
  } else if (!PHONE_PATTERN.test(contact)) {
    fieldErrors.contact = "연락처를 올바른 형식으로 입력해 주세요. (예: 010-1234-5678)";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", message: "입력 내용을 확인해 주세요.", fieldErrors };
  }

  let supabase;
  try {
    supabase = createSupabaseServerClient();
  } catch (err) {
    console.error(err);
    return {
      status: "error",
      message: "서버 설정 오류로 접수하지 못했습니다. 관리자에게 문의해 주세요.",
    };
  }

  const { error } = await supabase.from("quote_requests").insert({
    origin,
    destination,
    tonnage,
    vehicle_type: vehicleType,
    contact,
  });

  if (error) {
    console.error("Supabase quote_requests insert failed", error);
    return {
      status: "error",
      message: "저장 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }

  return {
    status: "success",
    message: "견적 문의가 접수되었습니다. 담당 배차 매니저가 빠르게 연락드리겠습니다.",
  };
}
