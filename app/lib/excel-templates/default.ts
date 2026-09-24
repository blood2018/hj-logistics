import type { ExcelTemplate } from "./types";

const COLUMNS = [
  { header: "날짜", key: "dispatch_date", width: 12 },
  { header: "회사구분", key: "company", width: 18 },
  { header: "상차지", key: "origin", width: 28 },
  { header: "하차지", key: "destination", width: 28 },
  { header: "톤수", key: "tonnage", width: 8 },
  { header: "기사", key: "driver", width: 12 },
  { header: "금액", key: "amount", width: 14 },
];

const thin = { style: "thin" as const, color: { argb: "FFBFBFBF" } };
const border = { top: thin, left: thin, bottom: thin, right: thin };

export const defaultTemplate: ExcelTemplate = {
  id: "default",
  label: "기본 양식",
  companies: [],
  build(workbook, rows, filters) {
    const sheet = workbook.addWorksheet("운송내역", {
      views: [{ state: "frozen", ySplit: 3 }],
    });
    sheet.columns = COLUMNS.map(({ key, width }) => ({ key, width }));

    const period =
      filters.dateFrom || filters.dateTo
        ? `${filters.dateFrom || "처음"} ~ ${filters.dateTo || "현재"}`
        : "전체 기간";
    const title = `${filters.company || "전체"} 운송내역 (${period})`;

    sheet.mergeCells(1, 1, 1, COLUMNS.length);
    const titleCell = sheet.getCell(1, 1);
    titleCell.value = title;
    titleCell.font = { size: 14, bold: true };
    titleCell.alignment = { horizontal: "center" };

    const headerRow = sheet.getRow(3);
    headerRow.values = COLUMNS.map((c) => c.header);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: "center" };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8EEF7" } };
      cell.border = border;
    });

    // 엑셀에서는 오래된 날짜가 위로 오는 편이 보기 좋으므로 오름차순으로 뒤집습니다.
    for (const row of [...rows].reverse()) {
      const added = sheet.addRow({ ...row, amount: Number(row.amount) });
      added.eachCell({ includeEmpty: true }, (cell) => (cell.border = border));
    }

    const total = rows.reduce((sum, row) => sum + Number(row.amount), 0);
    const totalRow = sheet.addRow({ driver: "합계", amount: total });
    totalRow.font = { bold: true };
    totalRow.eachCell({ includeEmpty: true }, (cell) => (cell.border = border));

    sheet.getColumn("amount").numFmt = "#,##0";
    sheet.getColumn("dispatch_date").alignment = { horizontal: "center" };
    sheet.getColumn("tonnage").alignment = { horizontal: "center" };
  },
};
