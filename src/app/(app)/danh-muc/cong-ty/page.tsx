import { db } from "@/db";
import { companies } from "@/db/schema";
import { desc } from "drizzle-orm";
import CompanyForm from "./CompanyForm";

export default async function CongTyPage() {
  const rows = await db
    .select()
    .from(companies)
    .orderBy(desc(companies.isInternal), companies.code);

  return (
    <main className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-xl font-bold text-slate-900 mb-4">Danh mục Công ty</h1>
      <CompanyForm />

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2">Mã</th>
              <th className="text-left px-4 py-2">Tên</th>
              <th className="text-left px-4 py-2">Loại</th>
              <th className="text-left px-4 py-2">MST</th>
              <th className="text-left px-4 py-2">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-mono">{c.code}</td>
                <td className="px-4 py-2">{c.name}</td>
                <td className="px-4 py-2">
                  {c.isInternal ? (
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-xs font-semibold">
                      Nội bộ VAP
                    </span>
                  ) : (
                    <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full text-xs font-semibold">
                      Khách thuê kho 3PL
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-slate-500">{c.mst || "—"}</td>
                <td className="px-4 py-2">
                  {c.active ? "Hoạt động" : "Ngừng hoạt động"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
