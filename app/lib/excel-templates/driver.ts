import { applyPrintLayout, toExcelDate } from "./shared";
import type { ExcelTemplate } from "./types";

// 기사 정산 양식: 사이트 조회 표를 그대로 엑셀로 옮기고(지급금액 포함), 그 아래에 기사별 소계 표를 붙입니다.
//   1행 머리줄, 2행부터 조회 결과와 같은 순서·같은 칸
//   합적이면 사이트와 같이 배차 칸(기사·전화번호·차량번호·지급금액)과 같은 날짜 칸을 셀 병합합니다.
//   청구금액은 넣지 않습니다 (기사 지급 정산용).
//   기사별 소계: 기사 | 배차 건수 | 지급금액 (지급금액은 배차마다 한 번만 더합니다)

const COLUMNS = [
  { header: "날짜", key: "dispatch_date", width: 11 },
  { header: "회사구분", key: "company", width: 14 },
  { header: "상차지", key: "origin", width: 18 },
  { header: "하차지", key: "destination", width: 22 },
  { header: "톤수", key: "tonnage", width: 8 },
  { header: "비고", key: "memo", width: 22 },
  { header: "기사", key: "driver", width: 12 },
  { header: "기사 전화번호", key: "driver_phone", width: 15 },
  { header: "차량번호", key: "vehicle_number", width: 14 },
  { header: "지급금액", key: "driver_pay", width: 12 },
] as const;

type Key = (typeof COLUMNS)[number]["key"];
const col = (key: Key) => COLUMNS.findIndex((c) => c.key === key) + 1;
const letter = (key: Key) => String.fromCharCode(64 + col(key));

const thin = { style: "thin" as const, color: { argb: "FFBFBFBF" } };
const border = { top: thin, left: thin, bottom: thin, right: thin };
const TRIP_KEYS = ["driver", "driver_phone", "vehicle_number", "driver_pay"] as const;
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
    sheet.columns = COLUMNS.map(({ key, width }) => ({ key, width }));

    const header = sheet.getRow(1);
    header.values = COLUMNS.map((c) => c.header);
    header.eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8EEF7" } };
      cell.border = border;
    });

    // 조회 표와 같은 순서 그대로 (rows는 조회 결과 순서)
    rows.forEach((row, index) => {
      const r = sheet.getRow(index + 2);
      r.getCell(col("dispatch_date")).value = toExcelDate(row.dispatch_date);
      r.getCell(col("company")).value = row.company;
      r.getCell(col("origin")).value = row.origin;
      r.getCell(col("destination")).value = row.destination;
      r.getCell(col("tonnage")).value = row.tonnage || null;
      r.getCell(col("memo")).value = row.memo || null;
      r.getCell(col("driver")).value = row.driver || null;
      r.getCell(col("driver_phone")).value = row.driver_phone || null;
      r.getCell(col("vehicle_number")).value = row.vehicle_number || null;
      r.getCell(col("driver_pay")).value = row.driver_pay == null ? null : Number(row.driver_pay);
    });

    // 사이트와 같은 셀 병합: 이어지는 같은 배차 줄의 배차 칸, 그중 날짜가 같은 줄의 날짜 칸
    for (let start = 0; start < rows.length; ) {
      let end = start;
      while (rows[end + 1]?.trip_id === rows[start].trip_id) end += 1;
      if (end > start) {
        for (const key of TRIP_KEYS) sheet.mergeCells(start + 2, col(key), end + 2, col(key));
        for (let d = start; d <= end; ) {
          let dEnd = d;
          while (dEnd < end && rows[dEnd + 1].dispatch_date === rows[d].dispatch_date) dEnd += 1;
          if (dEnd > d) sheet.mergeCells(d + 2, col("dispatch_date"), dEnd + 2, col("dispatch_date"));
          d = dEnd + 1;
        }
      }
      start = end + 1;
    }

    const lastRow = rows.length + 1;
    for (let r = 2; r <= lastRow; r++) {
      for (let c = 1; c <= COLUMNS.length; c++) {
        const cell = sheet.getRow(r).getCell(c);
        cell.border = border;
        cell.alignment = { vertical: "middle" };
      }
    }
    sheet.getColumn(col("dispatch_date")).numFmt = "yyyy-mm-dd";
    sheet.getColumn(col("driver_pay")).numFmt = "#,##0";
    for (const key of ["dispatch_date", "tonnage"] as const) {
      sheet.getColumn(col(key)).alignment = { horizontal: "center", vertical: "middle" };
    }

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
      cell.border = border;
    });
    drivers.forEach(([name, entry], i) => {
      const r = sheet.getRow(summaryTitleRow + 2 + i);
      const values = [name, entry.trips.size, entry.pay];
      values.forEach((value, c) => {
        const cell = r.getCell(c + 1);
        cell.value = value;
        cell.border = border;
        cell.alignment = { vertical: "middle", horizontal: c === 0 ? "left" : c === 1 ? "center" : "right" };
        if (c >= 2) cell.numFmt = "#,##0";
      });
    });
    const summaryLastRow = summaryTitleRow + 1 + drivers.length;

    applyPrintLayout(sheet, {
      printArea: `A1:${letter("driver_pay")}${Math.max(summaryLastRow, 1)}`,
      orientation: "landscape",
      titleRows: "1:1",
    });
  },
};
