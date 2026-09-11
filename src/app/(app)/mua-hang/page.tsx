import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/db";
import {
  purchaseOrders,
  purchaseOrderLines,
  companies,
  suppliers,
  warehouses,
  items,
} from "@/db/schema";
import { and, eq, gte, lte, sql, desc, inArray } from "drizzle-orm";
import PoListFilters from "./PoListFilters";
import PoListTable, { type PoRow } from "./PoListTable";

export default async function MuaHangPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    supplierId?: string;
    itemId?: string;
    status?: string;
  }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const canSeeGia = !!(
    session?.user as unknown as { xemGiaNhap?: boolean }
  )?.xemGiaNhap;

  const conditions = [];
  if (sp.from) conditions.push(gte(purchaseOrders.createdDate, sp.from));
  if (sp.to) conditions.push(lte(purchaseOrders.createdDate, sp.to));
  if (sp.supplierId)
    conditions.push(eq(purchaseOrders.supplierId, Number(sp.supplierId)));
  if (sp.itemId) {
    const poIdsWithItem = db
      .select({ poId: purchaseOrderLines.poId })
      .from(purchaseOrderLines)
      .where(eq(purchaseOrderLines.itemId, Number(sp.itemId)));
    conditions.push(inArray(purchaseOrders.id, poIdsWithItem));
  }

  const rows = await db
    .select({
      id: purchaseOrders.id,
      poNumber: purchaseOrders.poNumber,
      createdDate: purchaseOrders.createdDate,
      companyCode: companies.code,
      supplierName: suppliers.name,
      warehouseName: warehouses.name,
      currency: purchaseOrders.currency,
      totalQty: sql<string>`coalesce(sum(${purchaseOrderLines.qty}), 0)`,
      totalRemain: sql<string>`coalesce(sum(${purchaseOrderLines.slChuaNhap}), 0)`,
      totalTien: sql<string>`coalesce(sum(${purchaseOrderLines.qty} * ${purchaseOrderLines.donGia}), 0)`,
    })
    .from(purchaseOrders)
    .innerJoin(companies, eq(companies.id, purchaseOrders.companyId))
    .innerJoin(suppliers, eq(suppliers.id, purchaseOrders.supplierId))
    .leftJoin(warehouses, eq(warehouses.id, purchaseOrders.warehouseId))
    .leftJoin(purchaseOrderLines, eq(purchaseOrderLines.poId, purchaseOrders.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .groupBy(
      purchaseOrders.id,
      companies.code,
      suppliers.name,
      warehouses.name,
      purchaseOrders.currency
    )
    .orderBy(desc(purchaseOrders.id));

  const filtered =
    sp.status === "full"
      ? rows.filter((r) => Number(r.totalRemain) === 0)
      : sp.status === "partial"
        ? rows.filter((r) => Number(r.totalRemain) > 0)
        : rows;

  const tableRows: PoRow[] = filtered.map((r) => ({
    id: r.id,
    poNumber: r.poNumber,
    createdDate: r.createdDate,
    companyCode: r.companyCode,
    supplierName: r.supplierName,
    warehouseName: r.warehouseName,
    currency: r.currency,
    totalQty: r.totalQty,
    totalRemain: r.totalRemain,
    totalTien: r.totalTien,
  }));

  const [supplierRows, itemRows] = await Promise.all([
    db
      .select({ id: suppliers.id, name: suppliers.name })
      .from(suppliers)
      .where(eq(suppliers.active, true)),
    db
      .select({ id: items.id, maHang: items.maHang, tenHang: items.tenHang })
      .from(items),
  ]);

  return (
    <main className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-slate-900">Mua hàng (PO)</h1>
        <Link
          href="/mua-hang/moi"
          className="rounded-md bg-orange-600 text-white px-4 py-1.5 text-sm font-semibold hover:bg-orange-700"
        >
          + Tạo đơn mua hàng
        </Link>
      </div>

      <PoListFilters
        suppliers={supplierRows.map((s) => ({ id: s.id, label: s.name }))}
        items={itemRows}
      />

      <PoListTable rows={tableRows} canSeeGia={canSeeGia} />
    </main>
  );
}
