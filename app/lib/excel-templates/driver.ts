import { applyPrintLayout } from "./shared";
import { columnLetter, thinBorder, writeSiteTable, type SiteColumnKey } from "./site-table";
import type { ExcelTemplate } from "./types";

// 기사 정산 양식: 사이트 조회 표를 그대로 엑셀로 옮기고(지급금액 포함), 그 아래에 기사별 소계 표를 붙입니다.
//   1행 머리줄, 2행부터 조회 결과와 같은 순서·같은 칸 (합적 셀 병합도 사이트와 같음)
//   청구금액은 넣지 않습니다 (기사 지급 정산용).
//   기사별 소계: 기사 | 배차 건수 | 지급금액 (지급금액은 배차마다 한 번만 더합니다)

const KEYS: SiteColumnKey[] = [
  "dispatch_date",
  "company",
  "origin",
  "destination",
  "tonnage",
  "memo",
  "driver",
  "driver_phone",
  "vehicle_number",
  "driver_pay",
];
const NO_DRIVER = "(기사 미입력)";

export const driverTemplate: ExcelTemplate = {
  id: "driver",
  label: "기사 정산",
  companies: [],
  fileLabel: (filters) => `기사정산_${filters.driver || "전체"}`,
  build(workbook, rows) {
    const sheet = workbook.addWorksheet("기사정산", {
      views: [{ state: "frozen", ySplit: 1 }],
    });
    const { lastRow } = writeSiteTable(sheet, rows, KEYS);

    // 기사별 소계 (표 아래 한 줄 띄우고)
    const byDriver = new Map<string, { trips: Set<string>; pay: number }>();
    const paidTrips = new Set<string>();
    for (const row of rows) {
      const name = row.driver.trim() || NO_DRIVER;
      if (!byDriver.has(name)) byDriver.set(name, { trips: new Set(), pay: 0 });
      const entry = byDriver.get(name)!;
      entry.trips.add(row.trip_id);
      if (!paidTrips.has(row.trip_id)) {
        paidTrips.add(row.trip_id);
        entry.pay += Number(row.driver_pay ?? 0);
      }
    }
    const drivers = [...byDriver.entries()].sort(([a], [b]) =>
      a === NO_DRIVER ? 1 : b === NO_DRIVER ? -1 : a.localeCompare(b, "ko")
    );

    const summaryTitleRow = lastRow + 2;
    sheet.getCell(summaryTitleRow, 1).value = "기사별 소계";
    sheet.getCell(summaryTitleRow, 1).font = { bold: true };
    const summaryHeader = sheet.getRow(summaryTitleRow + 1);
    ["기사", "배차 건수", "지급금액"].forEach((label, i) => {
      const cell = summaryHeader.getCell(i + 1);
      cell.value = label;
      cell.font = { bold: true };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8EEF7" } };
      cell.border = thinBorder;
    });
    drivers.forEach(([name, entry], i) => {
      const r = sheet.getRow(summaryTitleRow + 2 + i);
      const values = [name, entry.trips.size, entry.pay];
      values.forEach((value, c) => {
        const cell = r.getCell(c + 1);
        cell.value = value;
        cell.border = thinBorder;
        cell.alignment = { vertical: "middle", horizontal: c === 0 ? "left" : c === 1 ? "center" : "right" };
        // 소계 칸은 위 표의 날짜 칸 서식이 아니라 숫자/글자로 보이게 지정합니다.
        cell.numFmt = c === 2 ? "#,##0" : c === 1 ? "0" : "@";
      });
    });
    const summaryLastRow = summaryTitleRow + 1 + drivers.length;

    applyPrintLayout(sheet, {
      printArea: `A1:${columnLetter(KEYS.length)}${Math.max(summaryLastRow, 1)}`,
      orientation: "landscape",
      titleRows: "1:1",
    });
  },
};
