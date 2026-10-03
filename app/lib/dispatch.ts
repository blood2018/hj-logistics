import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { expandCompanyFilter, normalizeTonnage } from "@/app/lib/dispatch-options";

/**
 * 조회 결과 한 줄 = 회사별 청구 항목(짐) 하나 + 그 배차의 정보 (뷰 dispatch_items).
 * 날짜는 짐의 값이고, 기사·전화번호·차량번호·지급금액은 배차(dispatch_trips) 값입니다.
 */
export type DispatchRecord = {
  id: string;
  trip_id: string;
  dispatch_date: string;
  company: string;
  origin: string;
  destination: string;
  tonnage: string;
  driver: string;
  driver_phone: string;
  vehicle_number: string;
  memo: string;
  /** 청구금액 */
  amount: number;
  /** 지급금액 (배차 단위, 미입력이면 null) */
  driver_pay: number | null;
  created_at: string;
  trip_created_at: string;
  /** 같은 배차의 회사 줄 수 (2 이상이면 합적) */
  trip_size: number;
  /** 같은 배차의 회사 목록 "롯데케미칼, 센시텍" */
  trip_companies: string;
};

export type DispatchFilters = {
  dateFrom: string;
  dateTo: string;
  company: string;
  tonnage: string;
  driver: string;
  driverPhone: string;
  vehicleNumber: string;
};

export const FILTER_KEYS = [
  "dateFrom",
  "dateTo",
  "company",
  "tonnage",
  "driver",
  "driverPhone",
  "vehicleNumber",
] as const satisfies readonly (keyof DispatchFilters)[];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const PAGE_SIZE = 1000;

type SearchParamsLike =
  | URLSearchParams
  | { [key: string]: string | string[] | undefined };

export function todayInKorea() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
}

function shiftDate(isoDate: string, days: number) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function monthRange(year: number, monthIndex: number) {
  const first = new Date(Date.UTC(year, monthIndex, 1));
  const last = new Date(Date.UTC(year, monthIndex + 1, 0));
  return { from: first.toISOString().slice(0, 10), to: last.toISOString().slice(0, 10) };
}

/** 조회 화면의 기간 빠른 선택 버튼 (한국 시간 기준, 주는 월~일) */
export function periodPresets(today = todayInKorea()) {
  const [y, m, d] = today.split("-").map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=일
  const monday = shiftDate(today, -((weekday + 6) % 7));
  const yesterday = shiftDate(today, -1);

  return [
    { label: "오늘", from: today, to: today },
    { label: "어제", from: yesterday, to: yesterday },
    { label: "이번 주", from: monday, to: shiftDate(monday, 6) },
    { label: "이번 달", ...monthRange(y, m - 1) },
    { label: "지난달", ...monthRange(y, m - 2) },
  ];
}

/**
 * URL 파라미터를 조회 조건으로 바꿉니다.
 * 시작일·종료일 파라미터가 아예 없으면 오늘 날짜를 쓰고, 빈 값으로 오면(사용자가 지운 경우) 기간 제한 없이 조회합니다.
 */
export function parseDispatchFilters(params: SearchParamsLike): DispatchFilters {
  const get = (key: string) => {
    const value =
      params instanceof URLSearchParams ? params.get(key) : params[key];
    if (value === null || value === undefined) return undefined;
    return (Array.isArray(value) ? value[0] ?? "" : value).trim();
  };

  const today = todayInKorea();
  const filters = Object.fromEntries(
    FILTER_KEYS.map((key) => [key, get(key) ?? ""])
  ) as DispatchFilters;
  filters.dateFrom = get("dateFrom") ?? today;
  filters.dateTo = get("dateTo") ?? today;

  if (filters.dateFrom && !DATE_PATTERN.test(filters.dateFrom)) filters.dateFrom = "";
  if (filters.dateTo && !DATE_PATTERN.test(filters.dateTo)) filters.dateTo = "";
  filters.tonnage = normalizeTonnage(filters.tonnage);

  return filters;
}

// ilike 패턴에서 와일드카드로 해석되는 문자를 이스케이프합니다.
function toContainsPattern(value: string) {
  return `%${value.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
}

/**
 * 조건에 맞는 청구 항목을 전부 가져옵니다 (Supabase 1회 최대 1000건 제한을 페이지 단위로 넘깁니다).
 * 날짜 최신순이고, 합적으로 묶인 줄은 붙어서 나옵니다.
 */
export async function fetchDispatchRecords(filters: DispatchFilters) {
  const supabase = createSupabaseAdminClient();
  const rows: DispatchRecord[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    let query = supabase
      .from("dispatch_items")
      .select(
        "id, trip_id, dispatch_date, company, origin, destination, tonnage, driver, driver_phone, vehicle_number, memo, amount, driver_pay, created_at, trip_created_at, trip_size, trip_companies"
      );

    if (filters.dateFrom) query = query.gte("dispatch_date", filters.dateFrom);
    if (filters.dateTo) query = query.lte("dispatch_date", filters.dateTo);
    if (filters.company) query = query.in("company", expandCompanyFilter(filters.company));
    if (filters.tonnage) query = query.eq("tonnage", filters.tonnage);
    if (filters.driver) query = query.ilike("driver", toContainsPattern(filters.driver));
    if (filters.driverPhone)
      query = query.ilike("driver_phone", toContainsPattern(filters.driverPhone));
    if (filters.vehicleNumber)
      query = query.ilike("vehicle_number", toContainsPattern(filters.vehicleNumber));

    const { data, error } = await query
      .order("dispatch_date", { ascending: false })
      .order("trip_created_at", { ascending: false })
      .order("trip_id")
      .order("created_at", { ascending: true })
      .order("id")
      .range(from, from + PAGE_SIZE - 1)
      .returns<DispatchRecord[]>();

    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }

  return rows;
}
