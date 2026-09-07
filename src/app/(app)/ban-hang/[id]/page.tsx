import Link from "next/link";
import { db } from "@/db";
import { salesOrders, salesOrderLines, companies, customers, items, warehouses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

export default async function SoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const soId = Number(id);

  const [so] = await db
    .select({
      id: salesOrders.id,
      soNumber: salesOrders.soNumber,
      createdAt: salesOrders.createdAt,
      ghiChu: salesOrders.ghiChu,
      companyCode: companies.code,
      companyName: companies.name,
      customerName: customers.name,
    })
    .from(salesOrders)
    .innerJoin(companies, eq(companies.id, salesOrders.companyId))
    .innerJoin(customers, eq(customers.id, salesOrders.customerId))
    .where(eq(salesOrders.id, soId))
    .limit(1);

  if (!so) notFound();

  const lines = await db
    .select({
      id: salesOrderLines.id,
      maHang: items.maHang,
      tenHang: items.tenHang,
      ngayGiaoDuKien: salesOrderLines.ngayGiaoDuKien,
      donGia: salesOrderLines.donGia,
      soLuongDat: salesOrderLines.soLuongDat,
      slDaXuat: salesOrderLines.slDaXuat,
      khoXuatDuKienName: warehouses.name,
    })
    .from(salesOrderLines)
    .innerJoin(items, eq(items.id, salesOrderLines.itemId))
    .leftJoin(warehouses, eq(warehouses.id, salesOrderLines.khoXuatDuKienId))
    .where(eq(salesOrderLines.soId, soId));

  const totalRemain = lines.reduce(
    (s, l) => s + (Number(l.soLuongDat) - Number(l.slDaXuat)),
    0
  );

  return (
    <main className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-baseline justify-between mb-1">
        <h1 className="text-xl font-bold text-slate-900">{so.soNumber}</h1>
        {totalRemain > 0 && (
          <Link
            href={`/xuat-kho/moi?soId=${so.id}`}
            className="rounded-md bg-orange-600 text-white px-4 py-1.5 text-sm font-semibold hover:bg-orange-700"
          >
            Tạo phiếu xuất kho
          </Link>
        )}
      </div>
      <div className="text-sm text-slate-500 mb-6">
        {so.companyCode} — {so.companyName} · Khách: {so.customerName}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-3 py-2">Mã hàng</th>
              <th className="text-left px-3 py-2">Ngày giao DK</th>
              <th className="text-right px-3 py-2">Đơn giá</th>
              <th className="text-right px-3 py-2">SL đặt</th>
              <th className="text-right px-3 py-2">Đã xuất</th>
              <th className="text-right px-3 py-2">Còn lại</th>
              <th className="text-left px-3 py-2">Kho xuất DK</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => {
              const remain = Number(l.soLuongDat) - Number(l.slDaXuat);
              return (
                <tr key={l.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-mono">{l.maHang}</td>
                  <td className="px-3 py-2">{l.ngayGiaoDuKien}</td>
                  <td className="px-3 py-2 text-right">
                    {Number(l.donGia).toLocaleString("vi-VN")}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {Number(l.soLuongDat).toLocaleString("vi-VN")}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {Number(l.slDaXuat).toLocaleString("vi-VN")}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {remain > 0 ? (
                      <span className="text-amber-700 font-semibold">
                        {remain.toLocaleString("vi-VN")}
                      </span>
                    ) : (
                      <span className="text-emerald-700">0</span>
                    )}
                  </td>
                  <td className="px-3 py-2">{l.khoXuatDuKienName || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {so.ghiChu && <p className="mt-4 text-sm text-slate-500">Ghi chú: {so.ghiChu}</p>}
    </main>
  );
}
