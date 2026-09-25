// 클라이언트 컴포넌트와 서버 양쪽에서 쓰는 선택지입니다 (DB 클라이언트를 import하지 않습니다).
export const COMPANY_OPTIONS = [
  "센시텍",
  "락텍",
  "롯데케미칼",
  "유민",
  "성진정밀",
  "SKF",
  "한국총판",
  "SSOT",
  "DPC",
  "사토리",
  "위딘",
  "유니테크",
  "경일화학",
  "조은",
  "MMC",
];

/** 조회에서 하나로 묶어 보는 회사 그룹. 그룹 이름으로 조회하면 소속 회사가 모두 조회됩니다. */
export const COMPANY_GROUPS: Record<string, string[]> = {
  창원공동물류센터: [
    "롯데케미칼",
    "유민",
    "성진정밀",
    "SKF",
    "한국총판",
    "SSOT",
    "DPC",
    "사토리",
    "위딘",
    "유니테크",
    "경일화학",
    "조은",
    "MMC",
  ],
};

/** 조회 화면의 회사구분 선택지: 그룹에 속한 회사는 빼고 그룹 이름을 넣습니다. */
export const SEARCH_COMPANY_OPTIONS = [
  ...COMPANY_OPTIONS.filter(
    (company) => !Object.values(COMPANY_GROUPS).some((members) => members.includes(company))
  ),
  ...Object.keys(COMPANY_GROUPS),
];

/** 조회 조건의 회사구분 값을 실제 회사 목록으로 바꿉니다 (그룹이면 소속 회사 전체). */
export function expandCompanyFilter(company: string) {
  return COMPANY_GROUPS[company] ?? [company];
}

/** 톤수는 직접 입력합니다. 숫자만 입력하면 "톤"을 붙여 "5" → "5톤"처럼 표기를 맞춥니다. */
export function normalizeTonnage(raw: string) {
  const value = raw.trim().replace(/\s+/g, "");
  return /^\d+(\.\d+)?$/.test(value) ? `${value}톤` : value;
}
