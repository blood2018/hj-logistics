"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { isAuthorizedHeader } from "@/app/lib/admin-auth";
import { COMPANY_OPTIONS, normalizeTonnage } from "@/app/lib/dispatch-options";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";

// 날짜는 짐(청구 항목)의 값입니다. 등록 폼에서는 독립된 칸 하나로 받아 모든 회사 줄에 넣습니다.
// 배차(dispatch_trips): 차 한 번 — 기사, 전화번호, 차량번호, 지급금액
// 청구 항목(dispatch_records): 회사별 — 날짜, 회사구분, 상차지, 하차지, 톤수, 청구금액, 비고
// 전환 기간에는 청구 항목의 날짜·기사·전화번호·차량번호 칸도 배차 값과 같게 맞춰 둡니다
// (supabase/migrations/20261003_dispatch_trips.sql 참고).

type TripField = "dispatchDate" | "driver" | "driverPhone" | "vehicleNumber" | "driverPay";
type ItemField = "company" | "origin" | "destination" | "tonnage" | "amount" | "memo";

export type DispatchFormState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: Partial<Record<TripField, string>>;
  /** 회사 줄별 오류 (화면의 줄 순서와 같음) */
  itemErrors?: Partial<Record<ItemField, string>>[];
  /** 등록 성공 시 다음 입력에 남겨둘 값 */
  keep?: { dispatchDate: string; company: string };
  /** 등록 성공 시각 — 폼을 새로 그리는 기준으로 씁니다 */
  savedAt?: number;
};

type TripColumn = "dispatch_date" | "driver" | "driver_phone" | "vehicle_number" | "driver_pay";
type ItemColumn = "company" | "origin" | "destination" | "tonnage" | "amount" | "memo";
export type DispatchColumn = TripColumn | ItemColumn;

export type UpdateResult = { ok: true } | { ok: false; message: string };

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const PHONE_PATTERN = /^[0-9-]{9,13}$/;

type ParseResult = { value: string | number | null } | { error: string };
type Rule<C> = { column: C; parse: (raw: string) => ParseResult };

const parseMoney = (raw: string) => raw.replace(/[,\s원]/g, "");

// 입력 폼 필드명 → DB 컬럼과 검증 규칙. 등록과 셀 수정이 같은 규칙을 씁니다.
const TRIP_RULES: Record<TripField, Rule<TripColumn>> = {
  dispatchDate: {
    column: "dispatch_date",
    parse: (raw) => (DATE_PATTERN.test(raw) ? { value: raw } : { error: "날짜를 입력해 주세요." }),
  },
  driver: { column: "driver", parse: (raw) => ({ value: raw }) }, // 선택 입력
  driverPhone: {
    column: "driver_phone",
    // 선택 입력이지만, 입력했다면 형식을 확인합니다.
    parse: (raw) =>
      !raw || PHONE_PATTERN.test(raw)
        ? { value: raw }
        : { error: "전화번호를 올바르게 입력해 주세요. (예: 010-1234-5678)" },
  },
  vehicleNumber: { column: "vehicle_number", parse: (raw) => ({ value: raw }) }, // 선택 입력
  driverPay: {
    column: "driver_pay",
    // 선택 입력: 비우면 "미입력"(null)
    parse: (raw) => {
      const digits = parseMoney(raw);
      if (!digits) return { value: null };
      return /^\d+$/.test(digits)
        ? { value: Number(digits) }
        : { error: "지급금액을 숫자로 입력해 주세요." };
    },
  },
};

const ITEM_RULES: Record<ItemField, Rule<ItemColumn>> = {
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
  tonnage: { column: "tonnage", parse: (raw) => ({ value: normalizeTonnage(raw) }) }, // 선택 입력
  amount: {
    column: "amount",
    parse: (raw) => {
      const digits = parseMoney(raw);
      return /^\d+$/.test(digits)
        ? { value: Number(digits) }
        : { error: "청구금액을 숫자로 입력해 주세요." };
    },
  },
  memo: { column: "memo", parse: (raw) => ({ value: raw }) }, // 선택 입력
};

/** 등록 시 청구 항목에도 같은 값을 넣는 칸. 날짜는 짐의 값, 나머지는 전환 기간 동안 배차와 맞춰 둡니다. */
const MIRRORED_TRIP_COLUMNS: TripColumn[] = ["dispatch_date", "driver", "driver_phone", "vehicle_number"];

/** 회사 줄 입력칸 이름: item_company, item_origin … (줄마다 같은 이름, 화면 순서대로 전송) */
const itemInputName = (field: ItemField) => `item_${field}`;

// Server Action은 어떤 경로로든 POST 호출될 수 있어 proxy.ts의 /admin 매처만으로는 보호되지 않습니다.
async function assertAdmin() {
  const headerList = await headers();
  if (!isAuthorizedHeader(headerList.get("authorization"))) {
    throw new Error("Unauthorized");
  }
}

function pickMirrored(trip: Partial<Record<TripColumn, unknown>>) {
  return Object.fromEntries(
    MIRRORED_TRIP_COLUMNS.filter((c) => c in trip).map((c) => [c, trip[c]])
  );
}

export async function createDispatchRecord(
  _prevState: DispatchFormState,
  formData: FormData
): Promise<DispatchFormState> {
  await assertAdmin();

  const trip: Partial<Record<TripColumn, string | number | null>> = {};
  const fieldErrors: DispatchFormState["fieldErrors"] = {};
  for (const [field, rule] of Object.entries(TRIP_RULES) as [TripField, Rule<TripColumn>][]) {
    const result = rule.parse(String(formData.get(field) ?? "").trim());
    if ("error" in result) fieldErrors[field] = result.error;
    else trip[rule.column] = result.value;
  }

  const lineCount = formData.getAll(itemInputName("company")).length;
  const items: Partial<Record<ItemColumn, string | number | null>>[] = [];
  const itemErrors: NonNullable<DispatchFormState["itemErrors"]> = [];
  for (let i = 0; i < lineCount; i++) {
    const item: (typeof items)[number] = {};
    const errors: (typeof itemErrors)[number] = {};
    for (const [field, rule] of Object.entries(ITEM_RULES) as [ItemField, Rule<ItemColumn>][]) {
      const raw = String(formData.getAll(itemInputName(field))[i] ?? "").trim();
      const result = rule.parse(raw);
      if ("error" in result) errors[field] = result.error;
      else item[rule.column] = result.value;
    }
    items.push(item);
    itemErrors.push(errors);
  }

  const hasItemErrors = itemErrors.some((e) => Object.keys(e).length > 0);
  if (lineCount === 0 || Object.keys(fieldErrors).length > 0 || hasItemErrors) {
    return {
      status: "error",
      message: lineCount === 0 ? "회사 줄을 하나 이상 입력해 주세요." : "입력 내용을 확인해 주세요.",
      fieldErrors,
      itemErrors,
    };
  }

  const supabase = createSupabaseAdminClient();
  const { data: savedTrip, error: tripError } = await supabase
    .from("dispatch_trips")
    .insert(trip)
    .select("id")
    .single<{ id: string }>();

  if (tripError || !savedTrip) {
    console.error("Supabase dispatch_trips insert failed", tripError);
    return { status: "error", message: "저장 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요." };
  }

  // 같은 배차 안에서 입력한 줄 순서대로 보이도록 등록 시각을 1ms씩 다르게 넣습니다.
  const base = Date.now();
  const { error: itemsError } = await supabase.from("dispatch_records").insert(
    items.map((item, index) => ({
      ...item,
      ...pickMirrored(trip),
      trip_id: savedTrip.id,
      created_at: new Date(base + index).toISOString(),
    }))
  );

  if (itemsError) {
    console.error("Supabase dispatch_records insert failed", itemsError);
    // 회사 줄 저장이 실패하면 방금 만든 배차도 지웁니다.
    await supabase.from("dispatch_trips").delete().eq("id", savedTrip.id);
    return { status: "error", message: "저장 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요." };
  }

  revalidatePath("/admin/dispatch");
  return {
    status: "success",
    message: items.length > 1 ? `합적 ${items.length}건이 등록되었습니다.` : "등록되었습니다.",
    keep: {
      dispatchDate: String(trip.dispatch_date ?? ""),
      company: String(items[0].company ?? ""),
    },
    savedAt: Date.now(),
  };
}

/**
 * 조회 표에서 셀 하나를 더블클릭해 수정할 때 호출됩니다.
 * - 배차 칸(기사·전화번호·차량번호·지급금액)은 배차를 고치므로 합적으로 묶인 건 모두에 반영됩니다.
 * - 날짜는 짐의 값이라 해당 줄만 고칩니다. 합쳐진 날짜 칸이면 합쳐진 줄들(ids)을 함께 고칩니다.
 */
export async function updateDispatchField(
  id: string | string[],
  column: DispatchColumn,
  rawValue: string
): Promise<UpdateResult> {
  await assertAdmin();

  const ids = (Array.isArray(id) ? id : [id]).filter(Boolean);
  const isItemDate = column === "dispatch_date";
  const tripRule = isItemDate
    ? undefined
    : Object.values(TRIP_RULES).find((r) => r.column === column);
  const itemRule = isItemDate
    ? TRIP_RULES.dispatchDate
    : Object.values(ITEM_RULES).find((r) => r.column === column);
  const rule = tripRule ?? itemRule;
  if (ids.length === 0 || !rule) return { ok: false, message: "잘못된 요청입니다." };

  const result = rule.parse(rawValue.trim());
  if ("error" in result) return { ok: false, message: result.error };

  const supabase = createSupabaseAdminClient();
  const failed = (error: unknown) => {
    console.error("Supabase dispatch update failed", error);
    return { ok: false as const, message: "저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  };

  if (tripRule) {
    const { data: record, error: findError } = await supabase
      .from("dispatch_records")
      .select("trip_id")
      .eq("id", ids[0])
      .single<{ trip_id: string }>();
    if (findError || !record) return failed(findError);

    const { error: tripError } = await supabase
      .from("dispatch_trips")
      .update({ [column]: result.value })
      .eq("id", record.trip_id);
    if (tripError) return failed(tripError);

    if (MIRRORED_TRIP_COLUMNS.includes(column as TripColumn)) {
      const { error: mirrorError } = await supabase
        .from("dispatch_records")
        .update({ [column]: result.value })
        .eq("trip_id", record.trip_id);
      if (mirrorError) return failed(mirrorError);
    }
  } else {
    const { error } = await supabase
      .from("dispatch_records")
      .update({ [column]: result.value })
      .in("id", ids);
    if (error) return failed(error);
  }

  revalidatePath("/admin/dispatch");
  return { ok: true };
}

/** 회사 줄 하나를 지웁니다. 배차에 남은 줄이 없으면 배차도 지웁니다. */
export async function deleteDispatchRecord(formData: FormData) {
  await assertAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createSupabaseAdminClient();
  const { data: record } = await supabase
    .from("dispatch_records")
    .select("trip_id")
    .eq("id", id)
    .maybeSingle<{ trip_id: string | null }>();

  const { error } = await supabase.from("dispatch_records").delete().eq("id", id);
  if (error) {
    console.error("Supabase dispatch_records delete failed", error);
    throw new Error("삭제하지 못했습니다.");
  }

  if (record?.trip_id) {
    const { count } = await supabase
      .from("dispatch_records")
      .select("id", { count: "exact", head: true })
      .eq("trip_id", record.trip_id);
    if (count === 0) {
      await supabase.from("dispatch_trips").delete().eq("id", record.trip_id);
    }
  }

  revalidatePath("/admin/dispatch");
}
