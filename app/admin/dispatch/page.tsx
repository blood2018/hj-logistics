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

  const total = rows.reduce((sum, row) => sum + Number(row.amount), 0);

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
            <div className="flex flex-wrap items-end gap-x-6 gap-y-1">
              <p className="text-sm text-slate-500">
                조회 결과{" "}
                <strong className="text-xl font-bold tabular-nums text-slate-900">
                  {rows.length}
                </strong>
                건
              </p>
              <p className="text-sm text-slate-500">
                합계{" "}
                <strong className="text-xl font-bold tabular-nums text-slate-900">
                  {won.format(total)}
                </strong>
                원
              </p>
              <span className="pb-0.5 text-xs text-slate-400">
                셀을 더블클릭하면 수정할 수 있습니다 (Enter 저장 · Esc 취소)
              </span>
            </div>
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

  return (
    <form method="get" action="/admin/dispatch/export" className="flex items-center gap-2">
      {/* 빈 값도 넘겨야 사용자가 지운 날짜가 오늘 날짜로 되돌아가지 않습니다. */}
      {Object.entries(filters).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
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

function ResultTable({ rows }: { rows: DispatchRecord[] }) {
  return (
    <div className="max-h-[75vh] overflow-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-[1100px] text-left text-sm">
        <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-semibold text-slate-500 shadow-[inset_0_-1px_0_0_var(--color-slate-200)]">
          <tr>
            <th className="px-4 py-3">날짜</th>
            <th className="px-4 py-3">회사구분</th>
            <th className="px-4 py-3">상차지</th>
            <th className="px-4 py-3">하차지</th>
            <th className="px-4 py-3">톤수</th>
            <th className="px-4 py-3">기사</th>
            <th className="px-4 py-3">기사 전화번호</th>
            <th className="px-4 py-3">차량번호</th>
            <th className="px-4 py-3 text-right">청구금액</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.id} className="transition-colors even:bg-slate-50/60 hover:bg-blue-50/40">
              <EditableCell
                id={row.id}
                column="dispatch_date"
                value={row.dispatch_date}
                input="date"
                className="whitespace-nowrap text-slate-500"
              />
              <EditableCell
                id={row.id}
                column="company"
                value={row.company}
                input="select"
                options={COMPANY_OPTIONS}
                className="text-slate-900"
              />
              <EditableCell id={row.id} column="origin" value={row.origin} className="text-slate-900" />
              <EditableCell
                id={row.id}
                column="destination"
                value={row.destination}
                className="text-slate-900"
              />
              <EditableCell
                id={row.id}
                column="tonnage"
                value={row.tonnage}
                className="text-slate-900"
              />
              <EditableCell id={row.id} column="driver" value={row.driver} className="text-slate-900" />
              <EditableCell
                id={row.id}
                column="driver_phone"
                value={row.driver_phone}
                input="tel"
                className="whitespace-nowrap text-slate-900"
              />
              <EditableCell
                id={row.id}
                column="vehicle_number"
                value={row.vehicle_number}
                className="whitespace-nowrap text-slate-900"
              />
              <EditableCell
                id={row.id}
                column="amount"
                value={String(row.amount)}
                display={won.format(Number(row.amount))}
                input="number"
                className="text-right tabular-nums text-slate-900"
              />
              <td className="px-4 py-3 text-right">
                <DeleteButton id={row.id} />
              </td>
            </tr>
          ))}

          {rows.length === 0 && (
            <tr>
              <td colSpan={10} className="px-4 py-10 text-center text-slate-400">
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
