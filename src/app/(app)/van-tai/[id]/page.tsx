import { db } from "@/db";
import {
  dispatchOrders,
  dispatchVehicleAssignments,
  freightSurcharges,
  transferOrders,
  goodsIssues,
  warehouses,
  customers,
  carriers,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { notFound } from "next/navigation";
import AssignCarrierForm from "./AssignCarrierForm";

const whFrom = alias(warehouses, "wh_from");
const whTo = alias(warehouses, "wh_to");

const LOAI_LABEL: Record<string, string> = {
  NHAP_HANG: "Nhận hàng",
  LAY_HANG: "Lấy hàng",
  KHAC: "Khác",
};
const STATUS_LABEL: Record<string, string> = {
  CHO_DANG_KY: "Chờ đăng ký xe",
  CHO_VAO_KHO: "Chờ vào kho nhận hàng",
  CHO_LAY_GIAO_HANG: "Chờ lấy hàng giao khách",
  HOAN_THANH: "Hoàn thành",
};

export default async function VanTaiDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const orderId = Number(id);

  const [order] = await db
    .select({
      id: dispatchOrders.id,
      vtNumber: dispatchOrders.vtNumber,
      loaiDon: dispatchOrders.loaiDon,
      status: dispatchOrders.status,
      carrierId: dispatchOrders.carrierId,
      cuocVanChuyen: dispatchOrders.cuocVanChuyen,
      transferFromName: whFrom.name,
      transferToName: whTo.name,
      customerName: customers.name,
    })
    .from(dispatchOrders)
    .leftJoin(transferOrders, eq(transferOrders.id, dispatchOrders.sourceTransferOrderId))
    .leftJoin(whFrom, eq(whFrom.id, transferOrders.warehouseFromId))
    .leftJoin(whTo, eq(whTo.id, transferOrders.warehouseToId))
    .leftJoin(goodsIssues, eq(goodsIssues.id, dispatchOrders.sourceGoodsIssueId))
    .leftJoin(customers, eq(customers.id, goodsIssues.customerId))
    .where(eq(dispatchOrders.id, orderId))
    .limit(1);

  if (!order) notFound();

  const [assignments, surcharges, carrierRows] = await Promise.all([
    db
      .select()
      .from(dispatchVehicleAssignments)
      .where(eq(dispatchVehicleAssignments.dispatchOrderId, order.id)),
    db.select().from(freightSurcharges).where(eq(freightSurcharges.dispatchOrderId, order.id)),
    db.select().from(carriers).where(eq(carriers.active, true)),
  ]);

  return (
    <main className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-baseline justify-between mb-1">
        <h1 className="text-xl font-bold text-slate-900 font-mono">{order.vtNumber}</h1>
        <span className="text-sm text-slate-500">
          {LOAI_LABEL[order.loaiDon]} · {STATUS_LABEL[order.status]}
        </span>
      </div>
      <div className="text-sm text-slate-500 mb-6">
        {order.loaiDon === "NHAP_HANG" && order.transferFromName && (
          <>
            {order.transferFromName} → {order.transferToName}
          </>
        )}
        {order.loaiDon === "LAY_HANG" && order.customerName && <>Khách: {order.customerName}</>}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <AssignCarrierForm
          dispatchOrderId={order.id}
          carriers={carrierRows.map((c) => ({ id: c.id, name: c.name }))}
          currentCarrierId={order.carrierId}
          currentCuocVanChuyen={order.cuocVanChuyen}
        />

        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
          <h2 className="font-semibold text-slate-900 mb-2">Xe đã đăng ký</h2>
          {assignments.length === 0 && (
            <p className="text-slate-400">Tài xế chưa đăng ký xe.</p>
          )}
          {assignments.map((a) => (
            <div key={a.id} className="flex justify-between py-1 border-t border-slate-100 first:border-t-0">
              <span className="font-mono">{a.soXe}</span>
              <span>{a.tenTaiXe}</span>
              <span>{a.daXacNhan ? "✅" : "—"}</span>
            </div>
          ))}
        </div>
      </div>

      {surcharges.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
          <h2 className="font-semibold text-slate-900 mb-2">Phụ phí</h2>
          {surcharges.map((s) => (
            <div key={s.id} className="flex justify-between py-1">
              <span>{s.ten}</span>
              <span>{Number(s.soTien).toLocaleString("vi-VN")}</span>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
