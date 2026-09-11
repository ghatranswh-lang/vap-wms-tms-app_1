import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/db";
import {
  purchaseOrders,
  purchaseOrderLines,
  companies,
  suppliers,
  items,
  zones,
  warehouses,
  locations,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { canEdit } from "@/lib/perm";
import PoForm, { type PoInitialValues } from "../../moi/PoForm";

export default async function SuaPoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const poId = Number(id);
  const session = await auth();

  const [po] = await db
    .select()
    .from(purchaseOrders)
    .where(eq(purchaseOrders.id, poId))
    .limit(1);
  if (!po) notFound();

  if (!canEdit(session, "mua_hang")) {
    return (
      <main className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-xl font-bold text-slate-900 mb-2">
          Sửa đơn mua hàng
        </h1>
        <p className="text-sm text-slate-500">
          Bạn không có quyền sửa Mua hàng (PO). Liên hệ Admin nếu cần được
          cấp quyền.
        </p>
        <Link
          href={`/mua-hang/${poId}`}
          className="text-sm text-orange-600 hover:underline mt-4 inline-block"
        >
          ← Quay lại
        </Link>
      </main>
    );
  }

  const poLines = await db
    .select()
    .from(purchaseOrderLines)
    .where(eq(purchaseOrderLines.poId, poId));

  const hasReceipt = poLines.some(
    (l) => Number(l.slChuaNhap) < Number(l.qty) - 1e-6
  );
  if (hasReceipt) {
    return (
      <main className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-xl font-bold text-slate-900 mb-2">
          Sửa đơn mua hàng
        </h1>
        <p className="text-sm text-slate-500">
          Đơn <span className="font-mono">{po.poNumber}</span> đã có nhập kho
          — không thể sửa để tránh sai lệch tồn kho. Vui lòng tạo đơn mua
          hàng mới nếu cần điều chỉnh thêm.
        </p>
        <Link
          href={`/mua-hang/${poId}`}
          className="text-sm text-orange-600 hover:underline mt-4 inline-block"
        >
          ← Quay lại
        </Link>
      </main>
    );
  }

  const [companyRows, supplierRows, itemRows, zoneRows, warehouseRows, locationRows] =
    await Promise.all([
      db.select().from(companies).where(eq(companies.isInternal, true)),
      db.select().from(suppliers).where(eq(suppliers.active, true)),
      db.select().from(items).where(eq(items.active, true)),
      db
        .select({
          id: zones.id,
          companyId: zones.companyId,
          warehouseId: zones.warehouseId,
          name: zones.name,
        })
        .from(zones),
      db.select().from(warehouses).where(eq(warehouses.active, true)),
      db.select().from(locations).where(eq(locations.active, true)),
    ]);

  const initial: PoInitialValues = {
    companyId: po.companyId,
    supplierId: po.supplierId,
    warehouseId: po.warehouseId ?? "",
    currency: po.currency,
    ghiChu: po.ghiChu ?? "",
    custom: Object.entries((po.custom ?? {}) as Record<string, string>).map(
      ([key, value]) => ({ key, value })
    ),
    lines: poLines.map((l) => ({
      itemId: l.itemId,
      donGia: l.donGia,
      qty: l.qty,
      vatRate: l.vatRate,
      tthh: l.tthh,
      zoneId: l.zoneId ?? "",
      locationId: l.locationId ?? "",
      custom: Object.entries((l.custom ?? {}) as Record<string, string>).map(
        ([key, value]) => ({ key, value })
      ),
    })),
  };

  return (
    <main className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-xl font-bold text-slate-900 mb-4">
        Sửa đơn mua hàng {po.poNumber}
      </h1>
      <PoForm
        mode="edit"
        poId={po.id}
        initial={initial}
        companies={companyRows.map((c) => ({
          id: c.id,
          label: `${c.code} — ${c.name}`,
        }))}
        suppliers={supplierRows.map((s) => ({
          id: s.id,
          label: `${s.maNcc} — ${s.name}`,
        }))}
        items={itemRows.map((it) => ({
          id: it.id,
          maHang: it.maHang,
          tenHang: it.tenHang,
        }))}
        zones={zoneRows.map((z) => ({
          id: z.id,
          companyId: z.companyId,
          warehouseId: z.warehouseId,
          label: z.name,
        }))}
        warehouses={warehouseRows.map((w) => ({
          id: w.id,
          label: `${w.code} — ${w.name}`,
          wms: w.wms,
        }))}
        locations={locationRows.map((l) => ({
          id: l.id,
          zoneId: l.zoneId,
          label: l.name,
        }))}
      />
    </main>
  );
}
