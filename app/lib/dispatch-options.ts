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

/** 톤수는 직접 입력합니다. 숫자만 입력하면 "톤"을 붙여 "5" → "5톤"처럼 표기를 맞춥니다. */
export function normalizeTonnage(raw: string) {
  const value = raw.trim().replace(/\s+/g, "");
  return /^\d+(\.\d+)?$/.test(value) ? `${value}톤` : value;
}
