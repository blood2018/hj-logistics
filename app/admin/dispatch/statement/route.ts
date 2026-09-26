import ExcelJS from "exceljs";
import type { NextRequest } from "next/server";
import {
  fetchDispatchRecords,
  parseDispatchFilters,
  todayInKorea,
} from "@/app/lib/dispatch";
import { buildStatement } from "@/app/lib/excel-templates/statement";

// 거래명세표 다운로드. /admin/* 경로이므로 proxy.ts의 Basic Auth로 보호됩니다.
export async function GET(request: NextRequest) {
  const filters = parseDispatchFilters(request.nextUrl.searchParams);
  const today = todayInKorea();

  let rows;
  try {
    rows = await fetchDispatchRecords(filters);
  } catch (err) {
    console.error("dispatch_records statement failed", err);
    return new Response("데이터를 불러오지 못했습니다.", { status: 500 });
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "홍진종합물류";
  workbook.created = new Date();
  try {
    await buildStatement(workbook, rows, filters, today);
  } catch (err) {
    return new Response(err instanceof Error ? err.message : "거래명세표를 만들지 못했습니다.", {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = `거래명세표_${filters.company || "전체"}_${today}.xlsx`;

  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="statement_${today}.xlsx"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "no-store",
    },
  });
}
