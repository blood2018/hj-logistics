import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";

export const dynamic = "force-dynamic";

type QuoteRequestRow = {
  id: string;
  origin: string;
  destination: string;
  tonnage: string;
  vehicle_type: string;
  contact: string;
  created_at: string;
};

export default async function AdminPage() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("quote_requests")
    .select("id, origin, destination, tonnage, vehicle_type, contact, created_at")
    .order("created_at", { ascending: false })
    .returns<QuoteRequestRow[]>();

  const rows = data ?? [];

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-bold text-slate-900">견적 문의 목록</h1>
        <p className="mt-1 text-sm text-slate-500">총 {rows.length}건</p>

        {error && (
          <p className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            데이터를 불러오지 못했습니다: {error.message}
          </p>
        )}

        {!error && (
          <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">접수일시</th>
                  <th className="px-4 py-3">출발지</th>
                  <th className="px-4 py-3">도착지</th>
                  <th className="px-4 py-3">톤수</th>
                  <th className="px-4 py-3">차종</th>
                  <th className="px-4 py-3">연락처</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                      {new Date(row.created_at).toLocaleString("ko-KR")}
                    </td>
                    <td className="px-4 py-3 text-slate-900">{row.origin}</td>
                    <td className="px-4 py-3 text-slate-900">
                      {row.destination}
                    </td>
                    <td className="px-4 py-3 text-slate-900">
                      {row.tonnage}
                    </td>
                    <td className="px-4 py-3 text-slate-900">
                      {row.vehicle_type}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={`tel:${row.contact}`}
                        className="text-blue-700 hover:underline"
                      >
                        {row.contact}
                      </a>
                    </td>
                  </tr>
                ))}

                {rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-slate-400"
                    >
                      접수된 견적 문의가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
