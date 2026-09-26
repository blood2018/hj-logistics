import type ExcelJS from "exceljs";
import type { DispatchFilters, DispatchRecord } from "@/app/lib/dispatch";
import { COMPANY_GROUPS, COMPANY_OPTIONS } from "@/app/lib/dispatch-options";
import { loadTemplateFile } from "./shared";

// 거래명세표 원본 양식(files/statement.xlsx)을 불러와 채웁니다.
// 양식 파일은 원본에서 도장 이미지와 매달 바뀌는 값만 지운 것입니다.
//   B3        명세표 날짜 "YYYY년MM월DD일"
//   B5        "<받는 곳> 귀하"
//   C11 / E11 합계 금액 한글 표기 / "원정(\1,234,000)"
//   14~29행   품목 줄: B 월일(첫 줄만), C 품목(회사명), G 공급가액, H 세액(=G*0.1)
//   30행      G·H 합계,  32행  C 공급가액 · E 부가세 · G 합계
// 도장은 공개 저장소에 올리지 않고, 환경변수 STATEMENT_SEAL_BASE64(jpeg)가 있으면 원래 위치에 붙입니다.

const ITEM_FIRST_ROW = 14;
const ITEM_LAST_ROW = 29;
const SUM_ROW = 30;
const TOTAL_ROW = 32;

/** 회사(또는 그룹) → 거래명세표 받는 곳. 없으면 회사명 그대로 씁니다. */
const RECIPIENT_BY_GROUP: Record<string, string> = {
  창원공동물류센터: "한국로지스풀",
};

/** 원본 거래명세표의 품목 순서. 여기에 없는 회사는 회사 목록 순서로 뒤에 붙습니다. */
const ITEM_ORDER = ["SKF", "한국총판", "DPC", "SSOT", "유니테크", "경일화학", "사토리", "성진정밀", "위딘", "유민"];

function recipientFor(company: string) {
  if (!company) return "";
  if (RECIPIENT_BY_GROUP[company]) return RECIPIENT_BY_GROUP[company];
  const group = Object.entries(COMPANY_GROUPS).find(([, members]) => members.includes(company))?.[0];
  return (group && RECIPIENT_BY_GROUP[group]) || company;
}

const DIGITS = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];
const SMALL_UNITS = ["", "십", "백", "천"];
const BIG_UNITS = ["", "만", "억", "조"];

/** 15744300 → "일천오백칠십사만사천삼백" (명세표의 한글 금액 표기) */
export function toKoreanAmount(value: number) {
  let n = Math.round(value);
  if (n === 0) return "영";
  let result = "";
  for (let big = 0; n > 0; big++) {
    const group = n % 10000;
    n = Math.floor(n / 10000);
    if (group === 0) continue;
    let part = "";
    String(group)
      .padStart(4, "0")
      .split("")
      .forEach((digit, i) => {
        const d = Number(digit);
        if (d) part += DIGITS[d] + SMALL_UNITS[3 - i];
      });
    result = part + BIG_UNITS[big] + result;
  }
  return result;
}

function formatKoreanDate(isoDate: string) {
  const [y, m, d] = isoDate.split("-");
  return `${y}년${m}월${d}일`;
}

export async function buildStatement(
  workbook: ExcelJS.Workbook,
  rows: DispatchRecord[],
  filters: DispatchFilters,
  today: string
) {
  const sheet = await loadTemplateFile(workbook, "statement.xlsx");

  // 회사별 공급가액 합계
  const totals = new Map<string, number>();
  for (const row of rows) totals.set(row.company, (totals.get(row.company) ?? 0) + Number(row.amount));
  const order = [...ITEM_ORDER, ...COMPANY_OPTIONS.filter((c) => !ITEM_ORDER.includes(c))];
  const items = [...totals.entries()]
    .filter(([, amount]) => amount > 0)
    .sort(([a], [b]) => order.indexOf(a) - order.indexOf(b));

  const capacity = ITEM_LAST_ROW - ITEM_FIRST_ROW + 1;
  if (items.length > capacity) {
    throw new Error(`거래명세표 품목은 최대 ${capacity}줄까지 들어갑니다 (현재 ${items.length}개 회사).`);
  }

  // 명세표 날짜: 조회 종료일 → 마지막 운송일 → 오늘
  const lastDate = rows.reduce((max, row) => (row.dispatch_date > max ? row.dispatch_date : max), "");
  const statementDate = filters.dateTo || lastDate || today;
  const [y, m, d] = statementDate.split("-").map(Number);

  sheet.getCell("B3").value = formatKoreanDate(statementDate);
  sheet.getCell("B5").value = `${recipientFor(filters.company)} 귀하`.trim();

  items.forEach(([company, amount], index) => {
    const r = ITEM_FIRST_ROW + index;
    if (index === 0) sheet.getCell(`B${r}`).value = new Date(Date.UTC(y, m - 1, d));
    sheet.getCell(`C${r}`).value = company;
    sheet.getCell(`G${r}`).value = amount;
    sheet.getCell(`H${r}`).value = { formula: `G${r}*0.1`, result: amount * 0.1 };
  });

  const supply = items.reduce((sum, [, amount]) => sum + amount, 0);
  const vat = supply * 0.1;
  const total = supply + vat;
  const range = (col: string) => `${col}${ITEM_FIRST_ROW}:${col}${ITEM_LAST_ROW}`;

  sheet.getCell(`G${SUM_ROW}`).value = { formula: `SUM(${range("G")})`, result: supply };
  sheet.getCell(`H${SUM_ROW}`).value = { formula: `SUM(${range("H")})`, result: vat };
  sheet.getCell(`C${TOTAL_ROW}`).value = { formula: `G${SUM_ROW}`, result: supply };
  sheet.getCell(`E${TOTAL_ROW}`).value = { formula: `H${SUM_ROW}`, result: vat };
  sheet.getCell(`G${TOTAL_ROW}`).value = { formula: `C${TOTAL_ROW}+E${TOTAL_ROW}`, result: total };

  sheet.getCell("C11").value = toKoreanAmount(total);
  sheet.getCell("E11").value = `원정(\\${Math.round(total).toLocaleString("en-US")})`;

  const seal = process.env.STATEMENT_SEAL_BASE64;
  if (seal) {
    const imageId = workbook.addImage({ base64: seal, extension: "jpeg" });
    // 원본과 같은 위치(H5 칸 안쪽)·크기. 좌표는 원본 파일의 EMU 값을 그대로 씁니다.
    sheet.addImage(imageId, {
      tl: { nativeCol: 7, nativeColOff: 590550, nativeRow: 4, nativeRowOff: 47625 } as unknown as ExcelJS.Anchor,
      ext: { width: 37, height: 37 },
      editAs: "oneCell",
    });
  }
}
