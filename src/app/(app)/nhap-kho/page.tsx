import Link from "next/link";
import { db } from "@/db";
import {
  goodsReceipts,
  purchaseOrders,
  warehouses,
  goodsReceiptLines,
} from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";

export default async function NhapKhoPage() {
  const rows = await db
    .select({
      id: goodsReceipts.id,
      grnNumber: goodsReceipts.grnNumber,
      ngayNhap: goodsReceipts.ngayNhap,
      sourceType: goodsReceipts.sourceType,
      poNumber: purchaseOrders.poNumber,
      warehouseName: warehouses.name,
      totalQty: sql<string>`coalesce(sum(${goodsReceiptLines.soLuong}), 0)`,
    })
    .from(goodsReceipts)
    .leftJoin(purchaseOrders, eq(purchaseOrders.id, goodsReceipts.poId))
    .innerJoin(warehouses, eq(warehouses.id, goodsReceipts.warehouseId))
    .leftJoin(goodsReceiptLines, eq(goodsReceiptLines.receiptId, goodsReceipts.id))
    .groupBy(goodsReceipts.id, purchaseOrders.poNumber, warehouses.name)
    .orderBy(desc(goodsReceipts.id));

  return (
    <main className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-slate-900">Nhập kho</h1>
        <Link
          href="/nhap-kho/moi"
          className="rounded-md bg-orange-600 text-white px-4 py-1.5 text-sm font-semibold hover:bg-orange-700"
        >
          + Tạo phiếu nhập kho
        </Link>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2">Số phiếu</th>
              <th className="text-left px-4 py-2">Ngày nhập</th>
              <th className="text-left px-4 py-2">Nguồn</th>
              <th className="text-left px-4 py-2">Kho</th>
              <th className="text-right px-4 py-2">Tổng SL (KG)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-mono">
                  <Link href={`/nhap-kho/${r.id}`} className="text-orange-600 hover:underline">
                    {r.grnNumber}
                  </Link>
                </td>
                <td className="px-4 py-2">{r.ngayNhap}</td>
                <td className="px-4 py-2">
                  {r.sourceType === "PO" ? `Từ PO ${r.poNumber ?? ""}` : "Từ chuyển kho"}
                </td>
                <td className="px-4 py-2">{r.warehouseName}</td>
                <td className="px-4 py-2 text-right">
                  {Number(r.totalQty).toLocaleString("vi-VN")}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  Chưa có phiếu nhập kho nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
