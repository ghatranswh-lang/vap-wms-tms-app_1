import Link from "next/link";
import { db } from "@/db";
import {
  purchaseOrders,
  purchaseOrderLines,
  companies,
  suppliers,
} from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";

export default async function MuaHangPage() {
  const rows = await db
    .select({
      id: purchaseOrders.id,
      poNumber: purchaseOrders.poNumber,
      createdDate: purchaseOrders.createdDate,
      companyCode: companies.code,
      supplierName: suppliers.name,
      totalQty: sql<string>`coalesce(sum(${purchaseOrderLines.qty}), 0)`,
      totalRemain: sql<string>`coalesce(sum(${purchaseOrderLines.slChuaNhap}), 0)`,
    })
    .from(purchaseOrders)
    .innerJoin(companies, eq(companies.id, purchaseOrders.companyId))
    .innerJoin(suppliers, eq(suppliers.id, purchaseOrders.supplierId))
    .leftJoin(purchaseOrderLines, eq(purchaseOrderLines.poId, purchaseOrders.id))
    .groupBy(purchaseOrders.id, companies.code, suppliers.name)
    .orderBy(desc(purchaseOrders.id));

  return (
    <main className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-slate-900">Mua hàng (PO)</h1>
        <Link
          href="/mua-hang/moi"
          className="rounded-md bg-orange-600 text-white px-4 py-1.5 text-sm font-semibold hover:bg-orange-700"
        >
          + Tạo đơn mua hàng
        </Link>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2">Số PO</th>
              <th className="text-left px-4 py-2">Ngày tạo</th>
              <th className="text-left px-4 py-2">Công ty</th>
              <th className="text-left px-4 py-2">Nhà cung cấp</th>
              <th className="text-right px-4 py-2">Tổng SL</th>
              <th className="text-right px-4 py-2">Chưa nhập</th>
              <th className="text-left px-4 py-2">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const remain = Number(r.totalRemain);
              return (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-mono">
                    <Link
                      href={`/mua-hang/${r.id}`}
                      className="text-orange-600 hover:underline"
                    >
                      {r.poNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{r.createdDate}</td>
                  <td className="px-4 py-2">{r.companyCode}</td>
                  <td className="px-4 py-2">{r.supplierName}</td>
                  <td className="px-4 py-2 text-right">
                    {Number(r.totalQty).toLocaleString("vi-VN")}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {remain.toLocaleString("vi-VN")}
                  </td>
                  <td className="px-4 py-2">
                    {remain === 0 ? (
                      <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-xs font-semibold">
                        Đã nhập đủ
                      </span>
                    ) : (
                      <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full text-xs font-semibold">
                        Chưa nhập đủ
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  Chưa có đơn mua hàng nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
