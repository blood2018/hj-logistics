import ExcelJS from "exceljs";
import type { NextRequest } from "next/server";
import {
  fetchDispatchRecords,
  parseDispatchFilters,
  todayInKorea,
} from "@/app/lib/dispatch";
import {
  findTemplate,
  resolveTemplateForCompany,
} from "@/app/lib/excel-templates";

// /admin/* 경로이므로 proxy.ts의 Basic Auth로 보호됩니다.
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const filters = parseDispatchFilters(searchParams);
  const template =
    findTemplate(searchParams.get("template")) ??
    resolveTemplateForCompany(filters.company);

  let rows;
  try {
    rows = await fetchDispatchRecords(filters);
  } catch (err) {
    console.error("dispatch_records export failed", err);
    return new Response("데이터를 불러오지 못했습니다.", { status: 500 });
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "홍진종합물류";
  workbook.created = new Date();
  await template.build(workbook, rows, filters);

  const buffer = await workbook.xlsx.writeBuffer();
  const today = todayInKorea();
  const fileName = `운송내역_${filters.company || "전체"}_${today}.xlsx`;

  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="dispatch_${today}.xlsx"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "no-store",
    },
  });
}
