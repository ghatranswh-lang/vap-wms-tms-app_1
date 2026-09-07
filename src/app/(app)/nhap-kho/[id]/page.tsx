import { db } from "@/db";
import {
  goodsReceipts,
  goodsReceiptLines,
  purchaseOrders,
  warehouses,
  items,
  zones,
  locations,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

export default async function NhapKhoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const receiptId = Number(id);

  const [receipt] = await db
    .select({
      id: goodsReceipts.id,
      grnNumber: goodsReceipts.grnNumber,
      ngayNhap: goodsReceipts.ngayNhap,
      sourceType: goodsReceipts.sourceType,
      poNumber: purchaseOrders.poNumber,
      warehouseName: warehouses.name,
    })
    .from(goodsReceipts)
    .leftJoin(purchaseOrders, eq(purchaseOrders.id, goodsReceipts.poId))
    .innerJoin(warehouses, eq(warehouses.id, goodsReceipts.warehouseId))
    .where(eq(goodsReceipts.id, receiptId))
    .limit(1);

  if (!receipt) notFound();

  const lines = await db
    .select({
      id: goodsReceiptLines.id,
      maHang: items.maHang,
      tenHang: items.tenHang,
      soLuong: goodsReceiptLines.soLuong,
      tthh: goodsReceiptLines.tthh,
      lot: goodsReceiptLines.lot,
      zoneName: zones.name,
      locationName: locations.name,
    })
    .from(goodsReceiptLines)
    .innerJoin(items, eq(items.id, goodsReceiptLines.itemId))
    .leftJoin(zones, eq(zones.id, goodsReceiptLines.zoneId))
    .leftJoin(locations, eq(locations.id, goodsReceiptLines.locationId))
    .where(eq(goodsReceiptLines.receiptId, receiptId));

  return (
    <main className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-baseline justify-between mb-1">
        <h1 className="text-xl font-bold text-slate-900">{receipt.grnNumber}</h1>
        <span className="text-sm text-slate-500">{receipt.ngayNhap}</span>
      </div>
      <div className="text-sm text-slate-500 mb-6">
        {receipt.warehouseName} ·{" "}
        {receipt.sourceType === "PO" ? `Từ PO ${receipt.poNumber ?? ""}` : "Từ chuyển kho"}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-3 py-2">Mã hàng</th>
              <th className="text-left px-3 py-2">Tên hàng</th>
              <th className="text-right px-3 py-2">SL (KG)</th>
              <th className="text-left px-3 py-2">TTHH</th>
              <th className="text-left px-3 py-2">Khu vực</th>
              <th className="text-left px-3 py-2">Vị trí</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id} className="border-t border-slate-100">
                <td className="px-3 py-2 font-mono">{l.maHang}</td>
                <td className="px-3 py-2">{l.tenHang}</td>
                <td className="px-3 py-2 text-right">
                  {Number(l.soLuong).toLocaleString("vi-VN")}
                </td>
                <td className="px-3 py-2">{l.tthh}</td>
                <td className="px-3 py-2">{l.zoneName ?? "—"}</td>
                <td className="px-3 py-2">{l.locationName ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
