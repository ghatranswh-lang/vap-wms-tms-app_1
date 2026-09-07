import Link from "next/link";
import { db } from "@/db";
import { goodsIssues, goodsIssueLines, customers } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";

export default async function XuatKhoPage() {
  const rows = await db
    .select({
      id: goodsIssues.id,
      pxkNumber: goodsIssues.pxkNumber,
      ngayXuat: goodsIssues.ngayXuat,
      customerName: customers.name,
      soXe: goodsIssues.soXe,
      totalQty: sql<string>`coalesce(sum(${goodsIssueLines.soLuong}), 0)`,
    })
    .from(goodsIssues)
    .innerJoin(customers, eq(customers.id, goodsIssues.customerId))
    .leftJoin(goodsIssueLines, eq(goodsIssueLines.goodsIssueId, goodsIssues.id))
    .groupBy(goodsIssues.id, customers.name)
    .orderBy(desc(goodsIssues.id));

  return (
    <main className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-slate-900">Xuất kho (PXK)</h1>
        <Link
          href="/ban-hang"
          className="rounded-md bg-orange-600 text-white px-4 py-1.5 text-sm font-semibold hover:bg-orange-700"
        >
          + Tạo từ đơn bán hàng
        </Link>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2">Số PXK</th>
              <th className="text-left px-4 py-2">Ngày xuất</th>
              <th className="text-left px-4 py-2">Khách hàng</th>
              <th className="text-left px-4 py-2">Số xe</th>
              <th className="text-right px-4 py-2">Tổng SL (KG)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-mono">
                  <Link href={`/xuat-kho/${r.id}`} className="text-orange-600 hover:underline">
                    {r.pxkNumber}
                  </Link>
                </td>
                <td className="px-4 py-2">{r.ngayXuat}</td>
                <td className="px-4 py-2">{r.customerName}</td>
                <td className="px-4 py-2 font-mono">{r.soXe}</td>
                <td className="px-4 py-2 text-right">
                  {Number(r.totalQty).toLocaleString("vi-VN")}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  Chưa có phiếu xuất kho nào. Tạo từ 1 đơn bán hàng ở trang Bán hàng.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
