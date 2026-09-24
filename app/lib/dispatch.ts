import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";

export type DispatchRecord = {
  id: string;
  dispatch_date: string;
  company: string;
  origin: string;
  destination: string;
  tonnage: string;
  driver: string;
  amount: number;
  created_at: string;
};

export type DispatchFilters = {
  dateFrom: string;
  dateTo: string;
  company: string;
  origin: string;
  destination: string;
  tonnage: string;
  driver: string;
  amountMin: string;
  amountMax: string;
};

export const FILTER_KEYS = [
  "dateFrom",
  "dateTo",
  "company",
  "origin",
  "destination",
  "tonnage",
  "driver",
  "amountMin",
  "amountMax",
] as const satisfies readonly (keyof DispatchFilters)[];

export const TONNAGE_OPTIONS = [
  "1톤",
  "1.4톤",
  "2.5톤",
  "3.5톤",
  "5톤",
  "8톤",
  "11톤",
  "15톤",
  "18톤",
  "25톤",
];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const PAGE_SIZE = 1000;

type SearchParamsLike =
  | URLSearchParams
  | { [key: string]: string | string[] | undefined };

export function parseDispatchFilters(params: SearchParamsLike): DispatchFilters {
  const get = (key: string) => {
    const value =
      params instanceof URLSearchParams ? params.get(key) : params[key];
    return (Array.isArray(value) ? value[0] : value ?? "").trim();
  };

  const filters = Object.fromEntries(
    FILTER_KEYS.map((key) => [key, get(key)])
  ) as DispatchFilters;

  if (filters.dateFrom && !DATE_PATTERN.test(filters.dateFrom)) filters.dateFrom = "";
  if (filters.dateTo && !DATE_PATTERN.test(filters.dateTo)) filters.dateTo = "";
  if (filters.amountMin && !/^\d+$/.test(filters.amountMin)) filters.amountMin = "";
  if (filters.amountMax && !/^\d+$/.test(filters.amountMax)) filters.amountMax = "";

  return filters;
}

export function filtersToQueryString(filters: DispatchFilters) {
  const params = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    if (filters[key]) params.set(key, filters[key]);
  }
  return params.toString();
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
        "id, dispatch_date, company, origin, destination, tonnage, driver, amount, created_at"
      );

    if (filters.dateFrom) query = query.gte("dispatch_date", filters.dateFrom);
    if (filters.dateTo) query = query.lte("dispatch_date", filters.dateTo);
    if (filters.company) query = query.eq("company", filters.company);
    if (filters.origin) query = query.ilike("origin", toContainsPattern(filters.origin));
    if (filters.destination)
      query = query.ilike("destination", toContainsPattern(filters.destination));
    if (filters.tonnage) query = query.eq("tonnage", filters.tonnage);
    if (filters.driver) query = query.ilike("driver", toContainsPattern(filters.driver));
    if (filters.amountMin) query = query.gte("amount", Number(filters.amountMin));
    if (filters.amountMax) query = query.lte("amount", Number(filters.amountMax));

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

/** 입력 폼/검색 폼의 선택지로 쓰일 기존 회사명 목록 */
export async function fetchCompanyNames() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("dispatch_records")
    .select("company")
    .order("company")
    .limit(5000);

  if (error) throw error;
  return [...new Set((data ?? []).map((row) => row.company as string))];
}
