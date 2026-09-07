import { db } from "@/db";
import {
  goodsIssues,
  goodsIssueLines,
  goodsIssueSoLinks,
  salesOrders,
  customers,
  items,
  warehouses,
  zones,
  locations,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function XuatKhoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const giId = Number(id);

  const [gi] = await db
    .select({
      id: goodsIssues.id,
      pxkNumber: goodsIssues.pxkNumber,
      ngayXuat: goodsIssues.ngayXuat,
      donViVanTai: goodsIssues.donViVanTai,
      soXe: goodsIssues.soXe,
      tenTaiXe: goodsIssues.tenTaiXe,
      customerName: customers.name,
    })
    .from(goodsIssues)
    .innerJoin(customers, eq(customers.id, goodsIssues.customerId))
    .where(eq(goodsIssues.id, giId))
    .limit(1);
  if (!gi) notFound();

  const soLinks = await db
    .select({ soNumber: salesOrders.soNumber, soId: salesOrders.id })
    .from(goodsIssueSoLinks)
    .innerJoin(salesOrders, eq(salesOrders.id, goodsIssueSoLinks.salesOrderId))
    .where(eq(goodsIssueSoLinks.goodsIssueId, giId));

  const lines = await db
    .select({
      id: goodsIssueLines.id,
      maHang: items.maHang,
      tenHang: items.tenHang,
      soLuong: goodsIssueLines.soLuong,
      tthh: goodsIssueLines.tthh,
      warehouseName: warehouses.name,
      zoneName: zones.name,
      locationName: locations.name,
    })
    .from(goodsIssueLines)
    .innerJoin(items, eq(items.id, goodsIssueLines.itemId))
    .innerJoin(warehouses, eq(warehouses.id, goodsIssueLines.warehouseId))
    .leftJoin(zones, eq(zones.id, goodsIssueLines.zoneId))
    .leftJoin(locations, eq(locations.id, goodsIssueLines.locationId))
    .where(eq(goodsIssueLines.goodsIssueId, giId));

  return (
    <main className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-baseline justify-between mb-1">
        <h1 className="text-xl font-bold text-slate-900">{gi.pxkNumber}</h1>
        <span className="text-sm text-slate-500">{gi.ngayXuat}</span>
      </div>
      <div className="text-sm text-slate-500 mb-6">
        Khách: {gi.customerName} · {gi.donViVanTai || "—"} · Xe {gi.soXe || "—"} ·{" "}
        {gi.tenTaiXe || "—"}
        {soLinks.length > 0 && (
          <>
            {" "}
            · Từ đơn:{" "}
            {soLinks.map((s, i) => (
              <span key={s.soId}>
                {i > 0 && ", "}
                <Link href={`/ban-hang/${s.soId}`} className="text-orange-600 hover:underline">
                  {s.soNumber}
                </Link>
              </span>
            ))}
          </>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-3 py-2">Mã hàng</th>
              <th className="text-right px-3 py-2">SL (KG)</th>
              <th className="text-left px-3 py-2">TTHH</th>
              <th className="text-left px-3 py-2">Kho / Vị trí xuất</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id} className="border-t border-slate-100">
                <td className="px-3 py-2 font-mono">{l.maHang}</td>
                <td className="px-3 py-2 text-right">
                  {Number(l.soLuong).toLocaleString("vi-VN")}
                </td>
                <td className="px-3 py-2">{l.tthh}</td>
                <td className="px-3 py-2 text-xs">
                  {l.warehouseName}
                  {l.zoneName ? ` · ${l.zoneName} · ${l.locationName}` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
