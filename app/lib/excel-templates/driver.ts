import { applyPrintLayout, toExcelDate } from "./shared";
import type { ExcelTemplate } from "./types";

// 기사 정산 양식: 사이트 조회 표를 그대로 엑셀로 옮깁니다 (지급금액 포함, 소계·총계 없음).
//   1행 머리줄, 2행부터 조회 결과와 같은 순서·같은 칸
//   합적이면 사이트와 같이 배차 칸(기사·전화번호·차량번호·지급금액)과 같은 날짜 칸을 셀 병합합니다.

const COLUMNS = [
  { header: "날짜", key: "dispatch_date", width: 11 },
  { header: "회사구분", key: "company", width: 14 },
  { header: "상차지", key: "origin", width: 18 },
  { header: "하차지", key: "destination", width: 22 },
  { header: "톤수", key: "tonnage", width: 8 },
  { header: "청구금액", key: "amount", width: 12 },
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
      r.getCell(col("amount")).value = Number(row.amount);
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
    sheet.getColumn(col("amount")).numFmt = "#,##0";
    sheet.getColumn(col("driver_pay")).numFmt = "#,##0";
    for (const key of ["dispatch_date", "tonnage"] as const) {
      sheet.getColumn(col(key)).alignment = { horizontal: "center", vertical: "middle" };
    }

    applyPrintLayout(sheet, {
      printArea: `A1:${letter("driver_pay")}${Math.max(lastRow, 1)}`,
      orientation: "landscape",
      titleRows: "1:1",
    });
  },
};
