import type ExcelJS from "exceljs";
import type { ExcelTemplate } from "./types";

// templates/락텍.xls 양식을 재현합니다.
// 원본이 구형 .xls라 파일을 직접 불러오지 않고 서식을 코드로 옮겼습니다.
//   B1:L1  제목 "YY년 MM월 (홍진물류)락텍운송내역"
//   3행    일자 | 출지 | 착지 | 톤수 | 운송사 | 단가 | 횟수 | 운반비 | 비고   (C~K열)
//   4행~   같은 날짜의 두 번째 줄부터는 일자를 비웁니다. 비고에 차량번호, L열(테두리 밖)에 기사명.
//   마지막 합계 | … | 운반비 합계 | VAT 별도

const FONT = { name: "돋움", size: 11 };
const thin = { style: "thin" as const };
const BORDER = { top: thin, left: thin, bottom: thin, right: thin };
const CENTER = { horizontal: "center" as const, vertical: "middle" as const };

const NUM_FMT = '_-* #,##0_-;\\-* #,##0_-;_-* "-"_-;_-@_-';
const WON_FMT = '_-"₩"* #,##0_-;\\-"₩"* #,##0_-;_-"₩"* "-"_-;_-@_-';
const DATE_FMT = 'mm"월" dd"일"';

const COLUMN_WIDTHS: Record<string, number> = {
  A: 3,
  B: 10.2,
  C: 12.7,
  D: 12.3,
  E: 15,
  F: 6.9,
  G: 11.9,
  H: 11.9,
  I: 11.9,
  J: 14.8,
  K: 21.9,
  L: 16.6,
};

const HEADERS = ["일자", "출지", "착지", "톤수", "운송사", "단가", "횟수", "운반비", "비고"];
const FIRST_COL = 3; // C
const HEADER_ROW = 3;

function styleCell(cell: ExcelJS.Cell, options: { bold?: boolean; border?: boolean } = {}) {
  cell.font = { ...FONT, bold: options.bold ?? false };
  cell.alignment = CENTER;
  if (options.border !== false) cell.border = BORDER;
}

function toExcelDate(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export const roctecTemplate: ExcelTemplate = {
  id: "roctec",
  label: "락텍 양식",
  companies: ["락텍"],
  build(workbook, rows, filters) {
    const ordered = [...rows].reverse(); // 날짜 오름차순
    const baseDate = filters.dateFrom || ordered[0]?.dispatch_date || filters.dateTo;
    const [year, month] = (baseDate || new Date().toISOString().slice(0, 10)).split("-");

    const sheet = workbook.addWorksheet(`${year}.${month}`, {
      pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });
    for (const [col, width] of Object.entries(COLUMN_WIDTHS)) {
      sheet.getColumn(col).width = width;
    }

    sheet.getRow(1).height = 21.75;
    sheet.getRow(2).height = 24;
    sheet.mergeCells("B1:L1");
    const title = sheet.getCell("B1");
    title.value = `${year.slice(2)}년  ${month}월 (홍진물류)락텍운송내역`;
    styleCell(title, { bold: true, border: false });

    const headerRow = sheet.getRow(HEADER_ROW);
    headerRow.height = 27;
    HEADERS.forEach((header, i) => {
      const cell = headerRow.getCell(FIRST_COL + i);
      cell.value = header;
      styleCell(cell, { bold: true });
    });

    let rowNumber = HEADER_ROW + 1;
    let previousDate: string | null = null;
    for (const record of ordered) {
      const row = sheet.getRow(rowNumber);
      row.height = 27;

      const values: ExcelJS.CellValue[] = [
        record.dispatch_date === previousDate ? null : toExcelDate(record.dispatch_date),
        record.origin,
        record.destination,
        record.tonnage,
        "홍진물류",
        Number(record.amount),
        1,
        { formula: `H${rowNumber}*I${rowNumber}`, result: Number(record.amount) },
        record.vehicle_number, // 비고
      ];
      values.forEach((value, i) => {
        const cell = row.getCell(FIRST_COL + i);
        cell.value = value;
        styleCell(cell);
      });
      row.getCell("C").numFmt = DATE_FMT;
      row.getCell("H").numFmt = NUM_FMT;
      row.getCell("J").numFmt = WON_FMT;
      row.getCell("K").font = { ...FONT, bold: true };

      const driverCell = row.getCell("L");
      driverCell.value = record.driver;
      styleCell(driverCell, { border: false });

      previousDate = record.dispatch_date;
      rowNumber += 1;
    }

    const totalRow = sheet.getRow(rowNumber);
    totalRow.height = 27;
    for (let col = FIRST_COL; col < FIRST_COL + HEADERS.length; col++) {
      styleCell(totalRow.getCell(col));
    }
    totalRow.getCell("C").value = "합계";
    const total = rows.reduce((sum, record) => sum + Number(record.amount), 0);
    const totalCell = totalRow.getCell("J");
    totalCell.value =
      rowNumber > HEADER_ROW + 1
        ? { formula: `SUM(J${HEADER_ROW + 1}:J${rowNumber - 1})`, result: total }
        : 0;
    totalCell.numFmt = WON_FMT;
    totalCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } };
    totalRow.getCell("K").value = "VAT 별도";
  },
};
