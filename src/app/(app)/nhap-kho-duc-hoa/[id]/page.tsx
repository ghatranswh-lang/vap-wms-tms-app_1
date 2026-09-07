import { db } from "@/db";
import {
  transferOrders,
  transferOrderLines,
  warehouses,
  items,
  zones,
  locations,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { notFound } from "next/navigation";
import NhapKhoDucHoaForm from "./NhapKhoDucHoaForm";

const whFrom = alias(warehouses, "wh_from");
const whTo = alias(warehouses, "wh_to");
const zoneFrom = alias(zones, "zone_from");
const locFrom = alias(locations, "loc_from");
const zoneTo = alias(zones, "zone_to");
const locTo = alias(locations, "loc_to");

export default async function NhapKhoDucHoaDetailPage({
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
      toId: transferOrders.warehouseToId,
      toName: whTo.name,
      toCode: whTo.code,
    })
    .from(transferOrders)
    .innerJoin(whFrom, eq(whFrom.id, transferOrders.warehouseFromId))
    .innerJoin(whTo, eq(whTo.id, transferOrders.warehouseToId))
    .where(eq(transferOrders.id, orderId))
    .limit(1);

  if (!order || order.toCode !== "KHO-DUCHOA") notFound();

  const lines = await db
    .select({
      id: transferOrderLines.id,
      itemId: transferOrderLines.itemId,
      maHang: items.maHang,
      tenHang: items.tenHang,
      soLuong: transferOrderLines.soLuong,
      tthh: transferOrderLines.tthh,
      lot: transferOrderLines.lot,
      zoneFromName: zoneFrom.name,
      locFromName: locFrom.name,
      plannedZoneToId: transferOrderLines.zoneToId,
      plannedZoneToName: zoneTo.name,
      plannedLocationToId: transferOrderLines.locationToId,
      plannedLocToName: locTo.name,
    })
    .from(transferOrderLines)
    .innerJoin(items, eq(items.id, transferOrderLines.itemId))
    .leftJoin(zoneFrom, eq(zoneFrom.id, transferOrderLines.zoneFromId))
    .leftJoin(locFrom, eq(locFrom.id, transferOrderLines.locationFromId))
    .leftJoin(zoneTo, eq(zoneTo.id, transferOrderLines.zoneToId))
    .leftJoin(locTo, eq(locTo.id, transferOrderLines.locationToId))
    .where(eq(transferOrderLines.transferOrderId, orderId));

  // Khu vực / vị trí thuộc kho Đức Hòa, để chọn vị trí THẬT khi nhận hàng
  // (có thể khác vị trí dự kiến nếu vị trí đó đã đầy).
  const zoneRows = await db
    .select()
    .from(zones)
    .where(and(eq(zones.warehouseId, order.toId), eq(zones.active, true)));
  const locationRows = await db
    .select()
    .from(locations)
    .where(eq(locations.active, true));

  if (order.status === "HOAN_TAT") {
    return (
      <main className="max-w-3xl mx-auto px-6 py-8">
        <p className="text-sm text-emerald-700 bg-emerald-50 rounded-md px-4 py-3">
          Phiếu {order.ckNumber} đã được xác nhận nhận hàng.
        </p>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-xl font-bold text-slate-900 mb-1">
        Xác nhận nhận hàng — {order.ckNumber}
      </h1>
      <p className="text-sm text-slate-500 mb-6">
        {order.fromName} → {order.toName} · {order.donViVanTai || "—"} · Xe {order.soXe} ·{" "}
        {order.tenTaiXe}
      </p>

      <NhapKhoDucHoaForm
        transferOrderId={order.id}
        lines={lines.map((l) => ({
          lineId: l.id,
          maHang: l.maHang,
          tenHang: l.tenHang,
          soLuong: l.soLuong,
          tthh: l.tthh,
          zoneFromName: l.zoneFromName,
          locFromName: l.locFromName,
          plannedZoneToId: l.plannedZoneToId,
          plannedZoneToName: l.plannedZoneToName,
          plannedLocationToId: l.plannedLocationToId,
          plannedLocToName: l.plannedLocToName,
        }))}
        zones={zoneRows.map((z) => ({ id: z.id, name: z.name }))}
        locations={locationRows.map((l) => ({
          id: l.id,
          zoneId: l.zoneId,
          name: l.name,
          maxPallets: l.maxPallets,
          currentPallets: l.currentPallets,
        }))}
      />
    </main>
  );
}
