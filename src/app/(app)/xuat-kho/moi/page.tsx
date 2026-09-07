import { db } from "@/db";
import {
  salesOrders,
  salesOrderLines,
  customers,
  items,
  warehouses,
  zones,
  locations,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import XuatKhoForm from "./XuatKhoForm";

export default async function TaoXuatKhoPage({
  searchParams,
}: {
  searchParams: Promise<{ soId?: string }>;
}) {
  const { soId: soIdStr } = await searchParams;
  const soId = Number(soIdStr);
  if (!soId) notFound();

  const [so] = await db
    .select({
      id: salesOrders.id,
      soNumber: salesOrders.soNumber,
      customerId: salesOrders.customerId,
      customerName: customers.name,
    })
    .from(salesOrders)
    .innerJoin(customers, eq(customers.id, salesOrders.customerId))
    .where(eq(salesOrders.id, soId))
    .limit(1);
  if (!so) notFound();

  const lineRows = await db
    .select({
      id: salesOrderLines.id,
      itemId: salesOrderLines.itemId,
      maHang: items.maHang,
      tenHang: items.tenHang,
      soLuongDat: salesOrderLines.soLuongDat,
      slDaXuat: salesOrderLines.slDaXuat,
      khoXuatDuKienId: salesOrderLines.khoXuatDuKienId,
    })
    .from(salesOrderLines)
    .innerJoin(items, eq(items.id, salesOrderLines.itemId))
    .where(eq(salesOrderLines.soId, soId));

  const openLines = lineRows.filter((l) => Number(l.soLuongDat) - Number(l.slDaXuat) > 0);

  const [warehouseRows, zoneRows, locationRows] = await Promise.all([
    db.select().from(warehouses).where(eq(warehouses.active, true)),
    db.select().from(zones).where(eq(zones.active, true)),
    db.select().from(locations).where(eq(locations.active, true)),
  ]);

  return (
    <main className="max-w-5xl mx-auto px-6 py-8">
      <h1 className="text-xl font-bold text-slate-900 mb-1">Tạo phiếu xuất kho (PXK)</h1>
      <p className="text-sm text-slate-500 mb-6">
        Từ đơn bán hàng {so.soNumber} · Khách hàng: {so.customerName}
      </p>

      {openLines.length === 0 ? (
        <p className="text-sm text-amber-700 bg-amber-50 rounded-md px-4 py-3">
          Đơn bán hàng này đã xuất đủ, không còn dòng hàng nào cần xuất.
        </p>
      ) : (
        <XuatKhoForm
          soId={so.id}
          customerId={so.customerId}
          lines={openLines.map((l) => ({
            soLineId: l.id,
            itemId: l.itemId,
            maHang: l.maHang,
            tenHang: l.tenHang,
            conLai: Number(l.soLuongDat) - Number(l.slDaXuat),
            khoXuatDuKienId: l.khoXuatDuKienId,
          }))}
          warehouses={warehouseRows.map((w) => ({ id: w.id, code: w.code, name: w.name, wms: w.wms }))}
          zones={zoneRows.map((z) => ({ id: z.id, warehouseId: z.warehouseId, name: z.name }))}
          locations={locationRows.map((l) => ({
            id: l.id,
            zoneId: l.zoneId,
            name: l.name,
            maxPallets: l.maxPallets,
            currentPallets: l.currentPallets,
          }))}
        />
      )}
    </main>
  );
}
