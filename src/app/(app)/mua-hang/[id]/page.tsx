import { db } from "@/db";
import {
  purchaseOrders,
  purchaseOrderLines,
  companies,
  suppliers,
  items,
  zones,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

export default async function PoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const poId = Number(id);

  const [po] = await db
    .select({
      id: purchaseOrders.id,
      poNumber: purchaseOrders.poNumber,
      createdDate: purchaseOrders.createdDate,
      currency: purchaseOrders.currency,
      ghiChu: purchaseOrders.ghiChu,
      companyCode: companies.code,
      companyName: companies.name,
      supplierName: suppliers.name,
      zoneName: zones.name,
    })
    .from(purchaseOrders)
    .innerJoin(companies, eq(companies.id, purchaseOrders.companyId))
    .innerJoin(suppliers, eq(suppliers.id, purchaseOrders.supplierId))
    .leftJoin(zones, eq(zones.id, purchaseOrders.zoneId))
    .where(eq(purchaseOrders.id, poId))
    .limit(1);

  if (!po) notFound();

  const lines = await db
    .select({
      id: purchaseOrderLines.id,
      maHang: items.maHang,
      tenHang: items.tenHang,
      donGia: purchaseOrderLines.donGia,
      qty: purchaseOrderLines.qty,
      vatRate: purchaseOrderLines.vatRate,
      tthh: purchaseOrderLines.tthh,
      slChuaNhap: purchaseOrderLines.slChuaNhap,
    })
    .from(purchaseOrderLines)
    .innerJoin(items, eq(items.id, purchaseOrderLines.itemId))
    .where(eq(purchaseOrderLines.poId, poId));

  return (
    <main className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-baseline justify-between mb-1">
        <h1 className="text-xl font-bold text-slate-900">{po.poNumber}</h1>
        <span className="text-sm text-slate-500">{po.createdDate}</span>
      </div>
      <div className="text-sm text-slate-500 mb-6">
        {po.companyCode} — {po.companyName} · NCC: {po.supplierName}
        {po.zoneName ? ` · Khu vực đích: ${po.zoneName}` : ""}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-3 py-2">Mã hàng</th>
              <th className="text-left px-3 py-2">Tên hàng</th>
              <th className="text-right px-3 py-2">Đơn giá</th>
              <th className="text-right px-3 py-2">SL</th>
              <th className="text-right px-3 py-2">VAT%</th>
              <th className="text-left px-3 py-2">TTHH</th>
              <th className="text-right px-3 py-2">Chưa nhập</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id} className="border-t border-slate-100">
                <td className="px-3 py-2 font-mono">{l.maHang}</td>
                <td className="px-3 py-2">{l.tenHang}</td>
                <td className="px-3 py-2 text-right">
                  {Number(l.donGia).toLocaleString("vi-VN")}
                </td>
                <td className="px-3 py-2 text-right">
                  {Number(l.qty).toLocaleString("vi-VN")}
                </td>
                <td className="px-3 py-2 text-right">{l.vatRate}%</td>
                <td className="px-3 py-2">{l.tthh}</td>
                <td className="px-3 py-2 text-right">
                  {Number(l.slChuaNhap) > 0 ? (
                    <span className="text-amber-700 font-semibold">
                      {Number(l.slChuaNhap).toLocaleString("vi-VN")}
                    </span>
                  ) : (
                    <span className="text-emerald-700">0</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {po.ghiChu && (
        <p className="mt-4 text-sm text-slate-500">Ghi chú: {po.ghiChu}</p>
      )}
    </main>
  );
}
