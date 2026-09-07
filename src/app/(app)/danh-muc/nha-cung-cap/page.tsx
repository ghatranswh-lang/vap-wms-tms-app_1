import { db } from "@/db";
import { suppliers } from "@/db/schema";
import { desc } from "drizzle-orm";
import SupplierForm from "./SupplierForm";

export default async function NhaCungCapPage() {
  const rows = await db.select().from(suppliers).orderBy(desc(suppliers.id));

  return (
    <main className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-xl font-bold text-slate-900 mb-4">
        Danh mục Nhà cung cấp
      </h1>
      <SupplierForm />

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2">Mã NCC</th>
              <th className="text-left px-4 py-2">Tên</th>
              <th className="text-left px-4 py-2">MST</th>
              <th className="text-left px-4 py-2">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-mono">{s.maNcc}</td>
                <td className="px-4 py-2">{s.name}</td>
                <td className="px-4 py-2 text-slate-500">{s.mst || "—"}</td>
                <td className="px-4 py-2">
                  {s.active ? "Hoạt động" : "Ngừng hoạt động"}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  Chưa có nhà cung cấp nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
