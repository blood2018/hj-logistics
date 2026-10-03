import Link from "next/link";
import {
  fetchDispatchRecords,
  FILTER_KEYS,
  parseDispatchFilters,
  periodPresets,
  todayInKorea,
  type DispatchFilters,
  type DispatchRecord,
} from "@/app/lib/dispatch";
import {
  COMPANY_GROUPS,
  COMPANY_OPTIONS,
  UNGROUPED_COMPANY_OPTIONS,
} from "@/app/lib/dispatch-options";
import {
  EXCEL_TEMPLATES,
  resolveTemplateForCompany,
} from "@/app/lib/excel-templates";
import DispatchEntryForm from "./DispatchEntryForm";
import DeleteButton from "./DeleteButton";
import EditableCell from "./EditableCell";

export const dynamic = "force-dynamic";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

const won = new Intl.NumberFormat("ko-KR");

export default async function DispatchPage({
  searchParams,
}: PageProps<"/admin/dispatch">) {
  const filters = parseDispatchFilters(await searchParams);
  const today = todayInKorea();

  let rows: DispatchRecord[] = [];
  let loadError: string | null = null;
  try {
    rows = await fetchDispatchRecords(filters);
  } catch (err) {
    console.error("dispatch_records load failed", err);
    loadError = err instanceof Error ? err.message : "알 수 없는 오류";
  }

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-[1600px] space-y-8">
        <section>
          <h1 className="text-2xl font-bold text-slate-900">운송 내역</h1>
          <p className="mt-1 text-sm text-slate-500">
            운송 건을 등록하고, 조건별로 조회해 회사 양식에 맞춰 엑셀로 내려받을 수 있습니다.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">신규 등록</h2>
          <DispatchEntryForm today={today} />
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">조회</h2>
          <SearchForm filters={filters} />
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <Summary rows={rows} />
            <ExportForm filters={filters} />
          </div>

          {loadError ? (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              데이터를 불러오지 못했습니다: {loadError}
            </p>
          ) : (
            <ResultTable rows={rows} />
          )}
        </section>
      </div>
    </div>
  );
}

function SearchForm({ filters }: { filters: DispatchFilters }) {
  return (
    <form
      method="get"
      className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-white p-5 md:grid-cols-4 xl:grid-cols-[repeat(7,minmax(0,1fr))_auto]"
    >
      <PeriodPresets filters={filters} />
      <Field label="시작일">
        <input type="date" name="dateFrom" defaultValue={filters.dateFrom} className={inputClass} />
      </Field>
      <Field label="종료일">
        <input type="date" name="dateTo" defaultValue={filters.dateTo} className={inputClass} />
      </Field>
      <Field label="회사구분">
        <select name="company" defaultValue={filters.company} className={`${inputClass} bg-white`}>
          <option value="">전체</option>
          {UNGROUPED_COMPANY_OPTIONS.map((company) => (
            <option key={company} value={company}>
              {company}
            </option>
          ))}
          {/* 그룹 이름으로 고르면 소속 회사 전체, 아래 개별 회사로 고르면 그 회사만 조회합니다. */}
          {Object.entries(COMPANY_GROUPS).map(([group, members]) => [
            <option key={group} value={group}>
              {group} (전체)
            </option>,
            <optgroup key={`${group}-members`} label={group}>
              {members.map((company) => (
                <option key={company} value={company}>
                  {company}
                </option>
              ))}
            </optgroup>,
          ])}
        </select>
      </Field>
      <Field label="톤수">
        <input type="text" name="tonnage" defaultValue={filters.tonnage} className={inputClass} />
      </Field>
      <Field label="기사">
        <input type="text" name="driver" defaultValue={filters.driver} className={inputClass} />
      </Field>
      <Field label="기사 전화번호">
        <input type="text" name="driverPhone" defaultValue={filters.driverPhone} className={inputClass} />
      </Field>
      <Field label="차량번호">
        <input type="text" name="vehicleNumber" defaultValue={filters.vehicleNumber} className={inputClass} />
      </Field>
      <div className="col-span-2 flex items-end justify-end gap-2 whitespace-nowrap md:col-span-1">
        <Link
          href="/admin/dispatch"
          className="shrink-0 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
        >
          초기화
        </Link>
        <button
          type="submit"
          className="shrink-0 rounded-lg bg-blue-950 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-900"
        >
          조회
        </button>
      </div>
    </form>
  );
}

function ExportForm({ filters }: { filters: DispatchFilters }) {
  const matched = resolveTemplateForCompany(filters.company);
  // 빈 값도 넘겨야 사용자가 지운 날짜가 오늘 날짜로 되돌아가지 않습니다.
  const hiddenFilters = Object.entries(filters).map(([key, value]) => (
    <input key={key} type="hidden" name={key} value={value} />
  ));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form method="get" action="/admin/dispatch/export" className="flex items-center gap-2">
        {hiddenFilters}
        <select
          name="template"
          defaultValue={matched.id}
          aria-label="엑셀 양식"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
        >
          {EXCEL_TEMPLATES.map((template) => (
            <option key={template.id} value={template.id}>
              {template.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
        >
          엑셀 다운로드
        </button>
      </form>
      <form method="get" action="/admin/dispatch/statement">
        {hiddenFilters}
        <button
          type="submit"
          className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600"
        >
          거래명세표 다운로드
        </button>
      </form>
    </div>
  );
}

function PeriodPresets({ filters }: { filters: DispatchFilters }) {
  return (
    <div className="col-span-full flex flex-wrap items-center gap-2">
      <span className="mr-1 text-xs font-medium text-slate-600">기간 빠른 선택</span>
      {periodPresets().map((preset) => {
        const params = new URLSearchParams();
        for (const key of FILTER_KEYS) params.set(key, filters[key]);
        params.set("dateFrom", preset.from);
        params.set("dateTo", preset.to);
        const active = filters.dateFrom === preset.from && filters.dateTo === preset.to;

        return (
          <Link
            key={preset.label}
            href={`/admin/dispatch?${params}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              active
                ? "border-blue-950 bg-blue-950 text-white"
                : "border-slate-300 text-slate-600 hover:border-blue-900 hover:text-blue-900"
            }`}
          >
            {preset.label}
          </Link>
        );
      })}
    </div>
  );
}

/**
 * 합계 계산. 지급금액은 배차 단위라 한 번만 셉니다.
 * 회사 조회처럼 합적 배차의 일부 줄만 조회된 경우, 그 배차의 지급금액은 나눌 근거가 없어 지급·수익에서 뺍니다.
 */
function summarize(rows: DispatchRecord[]) {
  const linesInResult = new Map<string, number>();
  for (const row of rows) linesInResult.set(row.trip_id, (linesInResult.get(row.trip_id) ?? 0) + 1);

  const billing = rows.reduce((sum, row) => sum + Number(row.amount), 0);
  let pay = 0;
  let profit = 0;
  let partialTrips = 0;
  let unpaidTrips = 0;
  const seen = new Set<string>();

  for (const row of rows) {
    if (seen.has(row.trip_id)) continue;
    seen.add(row.trip_id);
    if ((linesInResult.get(row.trip_id) ?? 0) < row.trip_size) {
      partialTrips += 1;
      continue;
    }
    if (row.driver_pay == null) {
      unpaidTrips += 1;
      continue;
    }
    const tripBilling = rows
      .filter((r) => r.trip_id === row.trip_id)
      .reduce((sum, r) => sum + Number(r.amount), 0);
    pay += Number(row.driver_pay);
    profit += tripBilling - Number(row.driver_pay);
  }

  return { billing, pay, profit, partialTrips, unpaidTrips, linesInResult };
}

function Summary({ rows }: { rows: DispatchRecord[] }) {
  const { billing, pay, profit, partialTrips, unpaidTrips } = summarize(rows);
  const notes = [
    partialTrips > 0 && `합적 일부만 조회된 배차 ${partialTrips}건은 지급·수익에서 제외`,
    unpaidTrips > 0 && `지급금액 미입력 배차 ${unpaidTrips}건은 수익에서 제외`,
  ].filter(Boolean);

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-1">
        <Stat label="조회 결과" value={String(rows.length)} unit="건" />
        <Stat label="청구 합계" value={won.format(billing)} unit="원" />
        <Stat label="지급 합계" value={won.format(pay)} unit="원" />
        <Stat label="수익" value={won.format(profit)} unit="원" />
        <span className="pb-0.5 text-xs text-slate-400">
          셀을 더블클릭하면 수정할 수 있습니다 (Enter 저장 · Esc 취소)
        </span>
      </div>
      {notes.length > 0 && <p className="text-xs text-slate-400">{notes.join(" · ")}</p>}
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <p className="text-sm text-slate-500">
      {label}{" "}
      <strong className="text-xl font-bold tabular-nums text-slate-900">{value}</strong>
      {unit}
    </p>
  );
}

const TRIP_SHARED_TITLE = "합적 배차 공통 항목입니다. 수정하면 묶인 건이 모두 바뀝니다.\n(더블클릭하여 수정)";

// 배차 묶음의 첫 칸과 머리줄에 세로 구분선을 넣습니다.
const TRIP_DIVIDER = "border-l border-slate-200";
// 합적으로 묶인 줄들의 왼쪽 끝에 이어지는 세로 막대
const COMBINED_BAR = "shadow-[inset_3px_0_0_0_var(--color-blue-500)]";

function ResultTable({ rows }: { rows: DispatchRecord[] }) {
  const { linesInResult } = summarize(rows);

  return (
    <div className="max-h-[75vh] overflow-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-[1360px] text-left text-sm">
        {/* 날짜 | 회사별 청구 | 배차 — 배차 칸을 고치면 합적으로 묶인 건이 모두 바뀝니다 */}
        <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-semibold text-slate-500 shadow-[inset_0_-1px_0_0_var(--color-slate-200)]">
          <tr className="border-b border-slate-200">
            <th rowSpan={2} className="px-3 py-2 align-bottom">
              날짜
            </th>
            <th colSpan={6} className={`px-3 pt-2 pb-1 text-slate-700 ${TRIP_DIVIDER}`}>
              회사별 청구
            </th>
            <th colSpan={4} className={`bg-slate-100/80 px-3 pt-2 pb-1 text-slate-700 ${TRIP_DIVIDER}`}>
              배차
            </th>
            <th rowSpan={2} className="px-3 py-2" />
          </tr>
          <tr>
            <th className={`px-3 py-2 ${TRIP_DIVIDER}`}>회사구분</th>
            <th className="px-3 py-2">상차지</th>
            <th className="px-3 py-2">하차지</th>
            <th className="px-3 py-2">톤수</th>
            <th className="px-3 py-2 text-right">청구금액</th>
            <th className="w-56 px-3 py-2">비고</th>
            <th className={`bg-slate-100/80 px-3 py-2 ${TRIP_DIVIDER}`}>기사</th>
            <th className="bg-slate-100/80 px-3 py-2">기사 전화번호</th>
            <th className="bg-slate-100/80 px-3 py-2">차량번호</th>
            <th className="bg-slate-100/80 px-3 py-2 text-right">지급금액</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {rows.map((row, index) => {
            const isCombined = row.trip_size > 1;
            // 다음 줄이 같은 배차면 사이 가로줄을 지워 한 덩어리로 보이게 합니다.
            const continuesTrip = rows[index + 1]?.trip_id === row.trip_id;
            // 같은 배차가 이어지는 줄들은 배차 칸을 첫 줄에만 그리고 rowSpan으로 합칩니다 (엑셀 셀 병합처럼).
            const startsTripRun = rows[index - 1]?.trip_id !== row.trip_id;
            let tripRowSpan = 1;
            while (rows[index + tripRowSpan]?.trip_id === row.trip_id) tripRowSpan += 1;
            const tripTitle = isCombined ? TRIP_SHARED_TITLE : undefined;
            const partners = row.trip_companies
              .split(", ")
              .filter((company) => company !== row.company);
            const partial = (linesInResult.get(row.trip_id) ?? 0) < row.trip_size;

            const payDisplay = (
              <>
                {row.driver_pay == null ? "" : won.format(Number(row.driver_pay))}
                {partial && row.driver_pay != null && (
                  <span className="ml-1 text-xs text-slate-400">(합적 전체)</span>
                )}
              </>
            );
            const mergedTrip = tripRowSpan > 1 ? "align-middle" : "";

            return (
              <tr
                key={row.id}
                className={`transition-colors hover:bg-blue-50/40 ${
                  continuesTrip ? "border-b-0" : ""
                }`}
              >
                <EditableCell
                  id={row.id}
                  column="dispatch_date"
                  value={row.dispatch_date}
                  input="date"
                  title={tripTitle}
                  className={`whitespace-nowrap text-slate-500 ${isCombined ? COMBINED_BAR : ""}`}
                />

                {/* 회사별 청구 */}
                <EditableCell
                  id={row.id}
                  column="company"
                  value={row.company}
                  display={
                    <span className="whitespace-nowrap">
                      {row.company}
                      {isCombined && (
                        <span
                          className="ml-1.5 text-xs text-slate-400"
                          title={`${partners.join(", ")}와(과) 합적`}
                        >
                          합적
                        </span>
                      )}
                    </span>
                  }
                  input="select"
                  options={COMPANY_OPTIONS}
                  className={`text-slate-900 ${TRIP_DIVIDER}`}
                />
                <EditableCell id={row.id} column="origin" value={row.origin} className="text-slate-900" />
                <EditableCell
                  id={row.id}
                  column="destination"
                  value={row.destination}
                  className="text-slate-900"
                />
                <EditableCell id={row.id} column="tonnage" value={row.tonnage} className="text-slate-900" />
                <EditableCell
                  id={row.id}
                  column="amount"
                  value={String(row.amount)}
                  display={won.format(Number(row.amount))}
                  input="number"
                  className="text-right tabular-nums text-slate-900"
                />
                <EditableCell
                  id={row.id}
                  column="memo"
                  value={row.memo}
                  display={<span className="block max-w-56 truncate">{row.memo}</span>}
                  title={row.memo ? `${row.memo}\n(더블클릭하여 수정)` : undefined}
                  className="text-slate-600"
                />

                {/* 배차 — 합적이면 첫 줄에서만 그리고 아래 줄과 합칩니다 */}
                {startsTripRun && (
                  <>
                    <EditableCell
                      id={row.id}
                      column="driver"
                      value={row.driver}
                      title={tripTitle}
                      rowSpan={tripRowSpan}
                      className={`text-slate-900 ${TRIP_DIVIDER} ${mergedTrip}`}
                    />
                    <EditableCell
                      id={row.id}
                      column="driver_phone"
                      value={row.driver_phone}
                      input="tel"
                      title={tripTitle}
                      rowSpan={tripRowSpan}
                      className={`whitespace-nowrap text-slate-900 ${mergedTrip}`}
                    />
                    <EditableCell
                      id={row.id}
                      column="vehicle_number"
                      value={row.vehicle_number}
                      title={tripTitle}
                      rowSpan={tripRowSpan}
                      className={`whitespace-nowrap text-slate-900 ${mergedTrip}`}
                    />
                    <EditableCell
                      id={row.id}
                      column="driver_pay"
                      value={row.driver_pay == null ? "" : String(row.driver_pay)}
                      display={payDisplay}
                      input="number"
                      title={tripTitle}
                      rowSpan={tripRowSpan}
                      className={`whitespace-nowrap text-right tabular-nums text-slate-900 ${mergedTrip}`}
                    />
                  </>
                )}
                <td className="px-3 py-3 text-right">
                  <DeleteButton id={row.id} />
                </td>
              </tr>
            );
          })}

          {rows.length === 0 && (
            <tr>
              <td colSpan={12} className="px-4 py-10 text-center text-slate-400">
                조건에 맞는 운송 내역이 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}
