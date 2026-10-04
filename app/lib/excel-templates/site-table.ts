import type ExcelJS from "exceljs";
import type { DispatchRecord } from "@/app/lib/dispatch";
import { toExcelDate } from "./shared";

// 사이트 조회 표를 그대로 엑셀로 옮기는 공통 함수 (기본 양식, 기사 정산 양식에서 사용).
// 칸 이름·순서·줄 순서·합적 셀 병합을 사이트와 같게 맞춥니다.

export const SITE_COLUMNS = {
  dispatch_date: { header: "날짜", width: 11 },
  company: { header: "회사구분", width: 14 },
  origin: { header: "상차지", width: 18 },
  destination: { header: "하차지", width: 22 },
  tonnage: { header: "톤수", width: 8 },
  amount: { header: "청구금액", width: 12 },
  memo: { header: "비고", width: 22 },
  driver: { header: "기사", width: 12 },
  driver_phone: { header: "기사 전화번호", width: 15 },
  vehicle_number: { header: "차량번호", width: 14 },
  driver_pay: { header: "지급금액", width: 12 },
} as const;

export type SiteColumnKey = keyof typeof SITE_COLUMNS;

/** 사이트 표의 묶음 머리줄 (날짜는 묶음 밖) */
const GROUPS: { label: string; keys: SiteColumnKey[] }[] = [
  { label: "회사별 청구", keys: ["company", "origin", "destination", "tonnage", "amount", "memo"] },
  { label: "배차", keys: ["driver", "driver_phone", "vehicle_number", "driver_pay"] },
];
const TRIP_KEYS: SiteColumnKey[] = ["driver", "driver_phone", "vehicle_number", "driver_pay"];

export const thinBorder = (() => {
  const thin = { style: "thin" as const, color: { argb: "FFBFBFBF" } };
  return { top: thin, left: thin, bottom: thin, right: thin };
})();
const HEADER_FILL = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFE8EEF7" } };

function cellValue(row: DispatchRecord, key: SiteColumnKey): ExcelJS.CellValue {
  switch (key) {
    case "dispatch_date":
      return toExcelDate(row.dispatch_date);
    case "amount":
      return Number(row.amount);
    case "driver_pay":
      return row.driver_pay == null ? null : Number(row.driver_pay);
    default:
      return row[key] || null;
  }
}

/**
 * 시트 1행부터 사이트 표를 씁니다.
 * groupHeader면 사이트처럼 2줄 머리줄(묶음 이름 + 칸 이름)을 씁니다.
 * 반환값: 머리줄 줄 수와 마지막 데이터 줄 번호.
 */
export function writeSiteTable(
  sheet: ExcelJS.Worksheet,
  rows: DispatchRecord[],
  keys: SiteColumnKey[],
  options: { groupHeader?: boolean } = {}
) {
  const col = (key: SiteColumnKey) => keys.indexOf(key) + 1;
  sheet.columns = keys.map((key) => ({ key, width: SITE_COLUMNS[key].width }));

  const styleHeader = (cell: ExcelJS.Cell) => {
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.fill = HEADER_FILL;
    cell.border = thinBorder;
  };

  let headerRows = 1;
  if (options.groupHeader) {
    headerRows = 2;
    // 1행: 묶음 이름, 2행: 칸 이름. 묶음에 속하지 않는 칸(날짜)은 두 줄을 합칩니다.
    keys.forEach((key, i) => {
      sheet.getCell(2, i + 1).value = SITE_COLUMNS[key].header;
      styleHeader(sheet.getCell(1, i + 1));
      styleHeader(sheet.getCell(2, i + 1));
    });
    for (const key of keys) {
      if (!GROUPS.some((g) => g.keys.includes(key))) {
        sheet.getCell(1, col(key)).value = SITE_COLUMNS[key].header;
        sheet.mergeCells(1, col(key), 2, col(key));
      }
    }
    for (const group of GROUPS) {
      const cols = group.keys.filter((k) => keys.includes(k)).map(col).sort((a, b) => a - b);
      if (cols.length === 0) continue;
      sheet.getCell(1, cols[0]).value = group.label;
      if (cols.length > 1) sheet.mergeCells(1, cols[0], 1, cols[cols.length - 1]);
    }
  } else {
    keys.forEach((key, i) => {
      const cell = sheet.getCell(1, i + 1);
      cell.value = SITE_COLUMNS[key].header;
      styleHeader(cell);
    });
  }

  const firstDataRow = headerRows + 1;
  rows.forEach((row, index) => {
    const r = sheet.getRow(firstDataRow + index);
    keys.forEach((key) => {
      const cell = r.getCell(col(key));
      cell.value = cellValue(row, key);
      cell.border = thinBorder;
      cell.alignment = {
        vertical: "middle",
        horizontal: key === "dispatch_date" || key === "tonnage" ? "center" : undefined,
      };
      if (key === "dispatch_date") cell.numFmt = "yyyy-mm-dd";
      if (key === "amount" || key === "driver_pay") cell.numFmt = "#,##0";
    });
  });

  // 사이트와 같은 셀 병합: 이어지는 같은 배차 줄의 배차 칸, 그중 날짜가 같은 줄의 날짜 칸
  const tripKeys = TRIP_KEYS.filter((k) => keys.includes(k));
  for (let start = 0; start < rows.length; ) {
    let end = start;
    while (rows[end + 1]?.trip_id === rows[start].trip_id) end += 1;
    if (end > start) {
      for (const key of tripKeys) {
        sheet.mergeCells(firstDataRow + start, col(key), firstDataRow + end, col(key));
      }
      if (keys.includes("dispatch_date")) {
        for (let d = start; d <= end; ) {
          let dEnd = d;
          while (dEnd < end && rows[dEnd + 1].dispatch_date === rows[d].dispatch_date) dEnd += 1;
          if (dEnd > d) {
            sheet.mergeCells(firstDataRow + d, col("dispatch_date"), firstDataRow + dEnd, col("dispatch_date"));
          }
          d = dEnd + 1;
        }
      }
    }
    start = end + 1;
  }

  return { headerRows, lastRow: headerRows + rows.length };
}

/** 열 번호 → 엑셀 열 문자 (1 → A) */
export function columnLetter(index: number) {
  let n = index;
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}
