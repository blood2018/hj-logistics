import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";

export type DispatchRecord = {
  id: string;
  dispatch_date: string;
  company: string;
  origin: string;
  destination: string;
  tonnage: string;
  driver: string;
  driver_phone: string;
  amount: number;
  created_at: string;
};

export type DispatchFilters = {
  dateFrom: string;
  dateTo: string;
  company: string;
  tonnage: string;
  driver: string;
  driverPhone: string;
};

export const FILTER_KEYS = [
  "dateFrom",
  "dateTo",
  "company",
  "tonnage",
  "driver",
  "driverPhone",
] as const satisfies readonly (keyof DispatchFilters)[];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const PAGE_SIZE = 1000;

type SearchParamsLike =
  | URLSearchParams
  | { [key: string]: string | string[] | undefined };

export function todayInKorea() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
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

  return filters;
}

// ilike 패턴에서 와일드카드로 해석되는 문자를 이스케이프합니다.
function toContainsPattern(value: string) {
  return `%${value.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
}

/** 조건에 맞는 배차 기록을 전부 가져옵니다 (Supabase 1회 최대 1000건 제한을 페이지 단위로 넘깁니다). */
export async function fetchDispatchRecords(filters: DispatchFilters) {
  const supabase = createSupabaseAdminClient();
  const rows: DispatchRecord[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    let query = supabase
      .from("dispatch_records")
      .select(
        "id, dispatch_date, company, origin, destination, tonnage, driver, driver_phone, amount, created_at"
      );

    if (filters.dateFrom) query = query.gte("dispatch_date", filters.dateFrom);
    if (filters.dateTo) query = query.lte("dispatch_date", filters.dateTo);
    if (filters.company) query = query.eq("company", filters.company);
    if (filters.tonnage) query = query.eq("tonnage", filters.tonnage);
    if (filters.driver) query = query.ilike("driver", toContainsPattern(filters.driver));
    if (filters.driverPhone)
      query = query.ilike("driver_phone", toContainsPattern(filters.driverPhone));

    const { data, error } = await query
      .order("dispatch_date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1)
      .returns<DispatchRecord[]>();

    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }

  return rows;
}
