import { COMPANY_GROUPS } from "@/app/lib/dispatch-options";
import {
  applyRowStyle,
  loadTemplateFile,
  reportYearMonth,
  snapshotRow,
  toExcelDate,
} from "./shared";
import type { ExcelTemplate } from "./types";

// 창원공동물류센터 원본 양식(files/changwon.xlsx)을 불러와 데이터만 채웁니다.
// 양식 파일 구성 (원본에서 실제 데이터만 지운 것):
//   B1     제목 "YY년 MM월 (홍진물류) 차량 배차 일지"
//   3행    일자 | 화주 | 출지 | 착지 | 톤수 | 운송사 | 운반비 | 비고   (B~I열)
//   4행    데이터 행 서식 견본
//   5행    회사별 소계 행 서식 견본 (B 회사명, C 소계)
//   6행    합계 행 서식 견본 (C 소계 합계, H 운반비 합계)
// 원본처럼 데이터 아래에 한 줄 띄우고 회사별 소계와 합계를 붙입니다.

const GROUP = "창원공동물류센터";
const MEMBERS = COMPANY_GROUPS[GROUP];
const DATA_ROW = 4;
const SUMMARY_ROW = 5;
const TOTAL_ROW = 6;
const LAST_COL = 12; // L

/** "2.5톤"처럼 숫자+톤이면 원본 양식처럼 숫자만 넣고, 그 밖의 표기("1톤왕복" 등)는 그대로 둡니다. */
function tonnageCellValue(tonnage: string) {
  const match = tonnage.match(/^(\d+(?:\.\d+)?)톤$/);
  return match ? Number(match[1]) : tonnage;
}

export const changwonTemplate: ExcelTemplate = {
  id: "changwon",
  label: "창원공동물류센터 양식",
  group: GROUP,
  companies: MEMBERS,
  async build(workbook, rows, filters) {
    const sheet = await loadTemplateFile(workbook, "changwon.xlsx");

    const ordered = [...rows].reverse(); // 날짜 오름차순
    const { year, month } = reportYearMonth(filters.dateFrom, filters.dateTo, ordered[0]?.dispatch_date);

    sheet.name = `${year}.${month}`;
    sheet.getCell("B1").value = `${year.slice(2)}년  ${month}월 (홍진물류) 차량 배차 일지`;

    const dataStyle = snapshotRow(sheet, DATA_ROW, LAST_COL);
    const summaryStyle = snapshotRow(sheet, SUMMARY_ROW, LAST_COL);
    const totalStyle = snapshotRow(sheet, TOTAL_ROW, LAST_COL);

    let rowNumber = DATA_ROW;
    let previousDate: string | null = null;
    for (const record of ordered) {
      const row = applyRowStyle(sheet, rowNumber, dataStyle);
      row.getCell("B").value =
        record.dispatch_date === previousDate ? null : toExcelDate(record.dispatch_date);
      row.getCell("C").value = record.company;
      row.getCell("D").value = record.origin;
      row.getCell("E").value = record.destination;
      row.getCell("F").value = tonnageCellValue(record.tonnage);
      row.getCell("G").value = "홍진물류";
      row.getCell("H").value = Number(record.amount);

      previousDate = record.dispatch_date;
      rowNumber += 1;
    }
    const lastDataRow = rowNumber - 1;
    const hasData = lastDataRow >= DATA_ROW;
    const dataRange = (col: string) => `${col}${DATA_ROW}:${col}${lastDataRow}`;

    // 한 줄 띄우고 회사별 소계
    rowNumber += 1;
    const summaryStart = rowNumber;
    for (const company of MEMBERS) {
      const row = applyRowStyle(sheet, rowNumber, summaryStyle);
      const subtotal = rows
        .filter((record) => record.company === company)
        .reduce((sum, record) => sum + Number(record.amount), 0);
      row.getCell("B").value = company;
      row.getCell("C").value = hasData
        ? { formula: `SUMIF(${dataRange("C")},B${rowNumber},${dataRange("H")})`, result: subtotal }
        : 0;
      rowNumber += 1;
    }

    const total = rows.reduce((sum, record) => sum + Number(record.amount), 0);
    const totalRow = applyRowStyle(sheet, rowNumber, totalStyle);
    totalRow.getCell("B").value = "합계";
    totalRow.getCell("C").value = { formula: `SUM(C${summaryStart}:C${rowNumber - 1})`, result: total };
    totalRow.getCell("H").value = hasData
      ? { formula: `SUM(${dataRange("H")})`, result: total }
      : 0;

    sheet.pageSetup.printArea = `A1:I${rowNumber}`;
  },
};
