import { db } from "@/db";
import { companies, customers, items, warehouses } from "@/db/schema";
import { eq } from "drizzle-orm";
import SoForm from "./SoForm";

export default async function TaoSoPage() {
  const [companyRows, customerRows, itemRows, warehouseRows] = await Promise.all([
    db.select().from(companies).where(eq(companies.isInternal, true)),
    db.select().from(customers).where(eq(customers.active, true)),
    db.select().from(items).where(eq(items.active, true)),
    db.select().from(warehouses).where(eq(warehouses.active, true)),
  ]);

  return (
    <main className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-xl font-bold text-slate-900 mb-4">Tạo đơn bán hàng (SO)</h1>
      <SoForm
        companies={companyRows.map((c) => ({ id: c.id, label: `${c.code} — ${c.name}` }))}
        customers={customerRows.map((c) => ({ id: c.id, label: `${c.maKh} — ${c.name}` }))}
        items={itemRows.map((it) => ({ id: it.id, maHang: it.maHang, tenHang: it.tenHang }))}
        warehouses={warehouseRows.map((w) => ({ id: w.id, label: w.name }))}
      />
    </main>
  );
}
