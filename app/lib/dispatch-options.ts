// 클라이언트 컴포넌트와 서버 양쪽에서 쓰는 선택지입니다 (DB 클라이언트를 import하지 않습니다).
export const COMPANY_OPTIONS = [
  "센시텍",
  "락텍",
  "보틀스",
  "대하(양산)",
  "유니스타",
  "신승",
  "마누리",
  "카이",
  "도건",
  "성진정밀2",
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
  "MMC",
  "에이큐",
  "기타",
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
      "MMC",
  "에이큐",
  ],
};

/** 조회 화면의 회사구분 선택지 중 그룹에 속하지 않은 회사 (그룹과 소속 회사는 따로 보여줍니다). */
export const UNGROUPED_COMPANY_OPTIONS = COMPANY_OPTIONS.filter(
  (company) => !Object.values(COMPANY_GROUPS).some((members) => members.includes(company))
);

/** 조회 조건의 회사구분 값을 실제 회사 목록으로 바꿉니다 (그룹이면 소속 회사 전체). */
export function expandCompanyFilter(company: string) {
  return COMPANY_GROUPS[company] ?? [company];
}

/** 톤수는 직접 입력합니다. 숫자만 입력하면 "톤"을 붙여 "5" → "5톤"처럼 표기를 맞춥니다. */
export function normalizeTonnage(raw: string) {
  const value = raw.trim().replace(/\s+/g, "");
  return /^\d+(\.\d+)?$/.test(value) ? `${value}톤` : value;
}

/**
 * 신규 등록에서 자동완성·전화번호/차량번호 자동 입력을 적용할 기사 (여기 있는 기사만 적용).
 * 값을 적어두면 그 값을 쓰고, 비워두면 그 기사의 가장 최근 배차 기록을 씁니다.
 */
export const AUTOFILL_DRIVERS: Record<string, { phone?: string; vehicle?: string }> = {
  정민철: { phone: "010-5380-6528" },
  김정주: {},
  정기술: {},
};

/** 신규 등록에서 기사를 비워두면 저장되는 이름 (소장님 직접 운행). 이때 지급금액이 비어 있으면 0으로 저장합니다. */
export const OWNER_DRIVER = "정홍진";

/**
 * 전화번호에 하이픈을 맞춰 넣습니다. 숫자만 입력해도 됩니다.
 *   01012345678 → 010-1234-5678,  0212345678 → 02-1234-5678,  15881234 → 1588-1234
 * 자릿수가 맞지 않으면 입력한 그대로 둡니다.
 */
export function formatPhone(raw: string) {
  const value = raw.trim();
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("02")) {
    if (digits.length === 9) return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
    if (digits.length === 10) return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length === 8 && !digits.startsWith("0")) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return value;
}
