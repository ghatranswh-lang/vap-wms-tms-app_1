import { db } from "@/db";
import {
  purchaseOrders,
  purchaseOrderLines,
  companies,
  suppliers,
  items,
  warehouses,
  zones,
  locations,
} from "@/db/schema";
import { eq, gt, sql } from "drizzle-orm";
import NhapKhoForm from "./NhapKhoForm";

export default async function TaoNhapKhoPage() {
  const poLineRows = await db
    .select({
      poId: purchaseOrders.id,
      poNumber: purchaseOrders.poNumber,
      companyId: purchaseOrders.companyId,
      companyCode: companies.code,
      supplierName: suppliers.name,
      poLineId: purchaseOrderLines.id,
      itemId: purchaseOrderLines.itemId,
      maHang: items.maHang,
      tenHang: items.tenHang,
      tthh: purchaseOrderLines.tthh,
      slChuaNhap: purchaseOrderLines.slChuaNhap,
    })
    .from(purchaseOrderLines)
    .innerJoin(purchaseOrders, eq(purchaseOrders.id, purchaseOrderLines.poId))
    .innerJoin(companies, eq(companies.id, purchaseOrders.companyId))
    .innerJoin(suppliers, eq(suppliers.id, purchaseOrders.supplierId))
    .innerJoin(items, eq(items.id, purchaseOrderLines.itemId))
    .where(gt(purchaseOrderLines.slChuaNhap, sql`0`));

  const [warehouseRows, zoneRows, locationRows] = await Promise.all([
    db.select().from(warehouses).where(eq(warehouses.active, true)),
    db.select().from(zones).where(eq(zones.active, true)),
    db.select().from(locations).where(eq(locations.active, true)),
  ]);

  const poMap = new Map<
    number,
    { poNumber: string; companyId: number; companyCode: string; supplierName: string; lines: typeof poLineRows }
  >();
  for (const row of poLineRows) {
    if (!poMap.has(row.poId)) {
      poMap.set(row.poId, {
        poNumber: row.poNumber,
        companyId: row.companyId,
        companyCode: row.companyCode,
        supplierName: row.supplierName,
        lines: [],
      });
    }
    poMap.get(row.poId)!.lines.push(row);
  }

  const pos = Array.from(poMap.entries()).map(([poId, v]) => ({
    poId,
    poNumber: v.poNumber,
    companyId: v.companyId,
    companyCode: v.companyCode,
    supplierName: v.supplierName,
    lines: v.lines.map((l) => ({
      poLineId: l.poLineId,
      itemId: l.itemId,
      maHang: l.maHang,
      tenHang: l.tenHang,
      tthh: l.tthh,
      slChuaNhap: Number(l.slChuaNhap),
    })),
  }));

  return (
    <main className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-xl font-bold text-slate-900 mb-1">Nhập kho</h1>
      <p className="text-sm text-slate-500 mb-4">
        Chỉ áp dụng cho Kho Cảng / Kho Mua nội địa — nhận hàng trực tiếp theo PO.
        Kho Đức Hòa chỉ nhận hàng qua phiếu Chuyển kho.
      </p>
      {pos.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-6 text-sm text-slate-500">
          Không có PO nào còn hàng chưa nhập. Hãy tạo PO trước ở mục Mua hàng.
        </div>
      ) : (
        <NhapKhoForm
          pos={pos}
          warehouses={warehouseRows
            .filter((w) => w.code !== "KHO-DUCHOA")
            .map((w) => ({ id: w.id, code: w.code, name: w.name, wms: w.wms }))}
          zones={zoneRows.map((z) => ({
            id: z.id,
            warehouseId: z.warehouseId,
            companyId: z.companyId,
            name: z.name,
          }))}
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
