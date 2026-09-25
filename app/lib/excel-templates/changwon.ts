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
// 데이터 행만 채웁니다 (원본 아래쪽의 회사별 소계·합계 영역은 넣지 않습니다).

const GROUP = "창원공동물류센터";
const MEMBERS = COMPANY_GROUPS[GROUP];
const DATA_ROW = 4;
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
    sheet.pageSetup.printArea = `A1:I${Math.max(rowNumber - 1, DATA_ROW)}`;
  },
};
