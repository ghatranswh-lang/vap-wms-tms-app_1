import { db } from "@/db";
import { companies, suppliers, items, zones, warehouses, locations } from "@/db/schema";
import { eq } from "drizzle-orm";
import PoForm from "./PoForm";

export default async function TaoPoPage() {
  const [companyRows, supplierRows, itemRows, zoneRows, warehouseRows, locationRows] =
    await Promise.all([
      db
        .select()
        .from(companies)
        .where(eq(companies.isInternal, true)),
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

  return (
    <main className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-xl font-bold text-slate-900 mb-4">
        Tạo đơn mua hàng (PO)
      </h1>
      <PoForm
        companies={companyRows.map((c) => ({ id: c.id, label: `${c.code} — ${c.name}` }))}
        suppliers={supplierRows.map((s) => ({ id: s.id, label: `${s.maNcc} — ${s.name}` }))}
        items={itemRows.map((it) => ({ id: it.id, maHang: it.maHang, tenHang: it.tenHang }))}
        zones={zoneRows.map((z) => ({
          id: z.id,
          companyId: z.companyId,
          warehouseId: z.warehouseId,
          label: z.name,
        }))}
        warehouses={warehouseRows.map((w) => ({ id: w.id, label: `${w.code} — ${w.name}`, wms: w.wms }))}
        locations={locationRows.map((l) => ({ id: l.id, zoneId: l.zoneId, label: l.name }))}
      />
    </main>
  );
}
