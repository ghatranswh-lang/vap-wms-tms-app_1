import Link from "next/link";
import { db } from "@/db";
import { salesOrders, salesOrderLines, companies, customers } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";

export default async function BanHangPage() {
  const rows = await db
    .select({
      id: salesOrders.id,
      soNumber: salesOrders.soNumber,
      createdAt: salesOrders.createdAt,
      companyCode: companies.code,
      customerName: customers.name,
      totalQty: sql<string>`coalesce(sum(${salesOrderLines.soLuongDat}), 0)`,
      totalRemain: sql<string>`coalesce(sum(${salesOrderLines.soLuongDat} - ${salesOrderLines.slDaXuat}), 0)`,
    })
    .from(salesOrders)
    .innerJoin(companies, eq(companies.id, salesOrders.companyId))
    .innerJoin(customers, eq(customers.id, salesOrders.customerId))
    .leftJoin(salesOrderLines, eq(salesOrderLines.soId, salesOrders.id))
    .groupBy(salesOrders.id, companies.code, customers.name)
    .orderBy(desc(salesOrders.id));

  return (
    <main className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-slate-900">Bán hàng (SO)</h1>
        <Link
          href="/ban-hang/moi"
          className="rounded-md bg-orange-600 text-white px-4 py-1.5 text-sm font-semibold hover:bg-orange-700"
        >
          + Tạo đơn bán hàng
        </Link>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2">Số SO</th>
              <th className="text-left px-4 py-2">Công ty</th>
              <th className="text-left px-4 py-2">Khách hàng</th>
              <th className="text-right px-4 py-2">Tổng SL đặt</th>
              <th className="text-right px-4 py-2">Chưa xuất</th>
              <th className="text-left px-4 py-2">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const remain = Number(r.totalRemain);
              return (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-mono">
                    <Link href={`/ban-hang/${r.id}`} className="text-orange-600 hover:underline">
                      {r.soNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{r.companyCode}</td>
                  <td className="px-4 py-2">{r.customerName}</td>
                  <td className="px-4 py-2 text-right">
                    {Number(r.totalQty).toLocaleString("vi-VN")}
                  </td>
                  <td className="px-4 py-2 text-right">{remain.toLocaleString("vi-VN")}</td>
                  <td className="px-4 py-2">
                    {remain === 0 ? (
                      <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-xs font-semibold">
                        Đã xuất đủ
                      </span>
                    ) : (
                      <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full text-xs font-semibold">
                        Chưa xuất đủ
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Chưa có đơn bán hàng nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
