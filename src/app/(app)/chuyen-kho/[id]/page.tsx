import { db } from "@/db";
import {
  transferOrders,
  transferOrderLines,
  warehouses,
  items,
  zones,
  locations,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { notFound } from "next/navigation";

const whFrom = alias(warehouses, "wh_from");
const whTo = alias(warehouses, "wh_to");
const zoneFrom = alias(zones, "zone_from");
const zoneTo = alias(zones, "zone_to");
const locFrom = alias(locations, "loc_from");
const locTo = alias(locations, "loc_to");

export default async function ChuyenKhoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const orderId = Number(id);

  const [order] = await db
    .select({
      id: transferOrders.id,
      ckNumber: transferOrders.ckNumber,
      status: transferOrders.status,
      soXe: transferOrders.soXe,
      tenTaiXe: transferOrders.tenTaiXe,
      donViVanTai: transferOrders.donViVanTai,
      fromName: whFrom.name,
      toName: whTo.name,
      toCode: whTo.code,
    })
    .from(transferOrders)
    .innerJoin(whFrom, eq(whFrom.id, transferOrders.warehouseFromId))
    .innerJoin(whTo, eq(whTo.id, transferOrders.warehouseToId))
    .where(eq(transferOrders.id, orderId))
    .limit(1);

  if (!order) notFound();

  const lines = await db
    .select({
      id: transferOrderLines.id,
      maHang: items.maHang,
      tenHang: items.tenHang,
      soLuong: transferOrderLines.soLuong,
      tthh: transferOrderLines.tthh,
      zoneFromName: zoneFrom.name,
      locFromName: locFrom.name,
      zoneToName: zoneTo.name,
      locToName: locTo.name,
    })
    .from(transferOrderLines)
    .innerJoin(items, eq(items.id, transferOrderLines.itemId))
    .leftJoin(zoneFrom, eq(zoneFrom.id, transferOrderLines.zoneFromId))
    .leftJoin(locFrom, eq(locFrom.id, transferOrderLines.locationFromId))
    .leftJoin(zoneTo, eq(zoneTo.id, transferOrderLines.zoneToId))
    .leftJoin(locTo, eq(locTo.id, transferOrderLines.locationToId))
    .where(eq(transferOrderLines.transferOrderId, orderId));

  return (
    <main className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-baseline justify-between mb-1">
        <h1 className="text-xl font-bold text-slate-900">{order.ckNumber}</h1>
        {order.status === "HOAN_TAT" ? (
          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-xs font-semibold">
            Hoàn tất
          </span>
        ) : (
          <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full text-xs font-semibold">
            Đang chuyển
          </span>
        )}
      </div>
      <div className="text-sm text-slate-500 mb-6">
        {order.fromName} → {order.toName} · {order.donViVanTai || "—"} · Xe {order.soXe} ·{" "}
        {order.tenTaiXe}
      </div>

      {order.toCode === "KHO-DUCHOA" && order.status === "DANG_CHUYEN" && (
        <p className="text-xs text-amber-700 bg-amber-50 rounded-md px-3 py-2 mb-4">
          Đang chờ Kho Đức Hòa xác nhận nhận hàng ở màn "Nhập kho Đức Hòa".
        </p>
      )}

      <div className="rounded-lg border border-slate-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-3 py-2">Mã hàng</th>
              <th className="text-right px-3 py-2">SL (KG)</th>
              <th className="text-left px-3 py-2">TTHH</th>
              <th className="text-left px-3 py-2">Nguồn</th>
              <th className="text-left px-3 py-2">Đích (dự kiến)</th>
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
                  {l.zoneFromName ? `${l.zoneFromName} · ${l.locFromName}` : "—"}
                </td>
                <td className="px-3 py-2 text-xs">
                  {l.zoneToName ? `${l.zoneToName} · ${l.locToName}` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
