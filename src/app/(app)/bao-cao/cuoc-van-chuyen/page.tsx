import { auth } from "@/auth";
import { db } from "@/db";
import { dispatchOrders, carriers, freightSurcharges } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";

export default async function CuocVanChuyenReportPage() {
  const session = await auth();
  const xemCuoc = (session?.user as unknown as { xemCuoc?: boolean })?.xemCuoc;

  if (!xemCuoc) {
    return (
      <main className="max-w-3xl mx-auto px-6 py-8">
        <p className="text-sm text-red-600 bg-red-50 rounded-md px-4 py-3">
          Tài khoản của bạn không có quyền xem báo cáo cước vận chuyển. Liên hệ quản
          trị viên nếu cần cấp quyền (quyền xemCuoc trên tài khoản).
        </p>
      </main>
    );
  }

  const surchargeTotals = db.$with("surcharge_totals").as(
    db
      .select({
        dispatchOrderId: freightSurcharges.dispatchOrderId,
        total: sql<string>`sum(${freightSurcharges.soTien})`.as("total"),
      })
      .from(freightSurcharges)
      .groupBy(freightSurcharges.dispatchOrderId)
  );

  const rows = await db
    .with(surchargeTotals)
    .select({
      id: dispatchOrders.id,
      vtNumber: dispatchOrders.vtNumber,
      loaiDon: dispatchOrders.loaiDon,
      status: dispatchOrders.status,
      carrierName: carriers.name,
      cuocVanChuyen: dispatchOrders.cuocVanChuyen,
      phuPhi: surchargeTotals.total,
      createdAt: dispatchOrders.createdAt,
    })
    .from(dispatchOrders)
    .leftJoin(carriers, eq(carriers.id, dispatchOrders.carrierId))
    .leftJoin(surchargeTotals, eq(surchargeTotals.dispatchOrderId, dispatchOrders.id))
    .orderBy(desc(dispatchOrders.id));

  const byCarrier = new Map<string, number>();
  let grandTotal = 0;
  for (const r of rows) {
    const cuoc = Number(r.cuocVanChuyen ?? 0) + Number(r.phuPhi ?? 0);
    grandTotal += cuoc;
    const key = r.carrierName ?? "— Chưa gán —";
    byCarrier.set(key, (byCarrier.get(key) ?? 0) + cuoc);
  }

  return (
    <main className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-xl font-bold text-slate-900 mb-1">Báo cáo cước vận chuyển</h1>
      <p className="text-sm text-slate-500 mb-6">
        Tổng hợp cước vận chuyển + phụ phí trên toàn bộ đơn vận tải.
      </p>

      <div className="rounded-lg border border-slate-200 bg-white p-4 mb-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Theo đơn vị vận tải</h2>
        <div className="flex flex-col gap-1 text-sm">
          {Array.from(byCarrier.entries()).map(([name, total]) => (
            <div key={name} className="flex justify-between">
              <span>{name}</span>
              <span className="font-medium">{total.toLocaleString("vi-VN")}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-slate-200 pt-1 mt-1 font-bold">
            <span>Tổng cộng</span>
            <span>{grandTotal.toLocaleString("vi-VN")}</span>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2">Số VT</th>
              <th className="text-left px-4 py-2">Đơn vị vận tải</th>
              <th className="text-right px-4 py-2">Cước</th>
              <th className="text-right px-4 py-2">Phụ phí</th>
              <th className="text-right px-4 py-2">Tổng</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const cuoc = Number(r.cuocVanChuyen ?? 0);
              const phuPhi = Number(r.phuPhi ?? 0);
              return (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-mono">{r.vtNumber}</td>
                  <td className="px-4 py-2">{r.carrierName ?? "— Chưa gán —"}</td>
                  <td className="px-4 py-2 text-right">{cuoc.toLocaleString("vi-VN")}</td>
                  <td className="px-4 py-2 text-right">{phuPhi.toLocaleString("vi-VN")}</td>
                  <td className="px-4 py-2 text-right font-medium">
                    {(cuoc + phuPhi).toLocaleString("vi-VN")}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  Chưa có đơn vận tải nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
