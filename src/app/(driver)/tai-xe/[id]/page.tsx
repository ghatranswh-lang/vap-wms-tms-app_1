import { auth } from "@/auth";
import { db } from "@/db";
import {
  dispatchOrders,
  dispatchVehicleAssignments,
  transferOrders,
  goodsIssues,
  warehouses,
  customers,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { notFound } from "next/navigation";
import RegisterForm from "./RegisterForm";
import CompleteForm from "./CompleteForm";

const whFrom = alias(warehouses, "wh_from");
const whTo = alias(warehouses, "wh_to");

const STATUS_LABEL: Record<string, string> = {
  CHO_DANG_KY: "Chờ đăng ký xe",
  CHO_VAO_KHO: "Chờ vào kho nhận hàng",
  CHO_LAY_GIAO_HANG: "Chờ lấy hàng giao khách",
  HOAN_THANH: "Hoàn thành",
};

export default async function TaiXeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const orderId = Number(id);

  const session = await auth();
  const carrierId = (session?.user as unknown as { carrierId?: number | null })?.carrierId;

  const [order] = await db
    .select({
      id: dispatchOrders.id,
      vtNumber: dispatchOrders.vtNumber,
      loaiDon: dispatchOrders.loaiDon,
      status: dispatchOrders.status,
      diaDiemText: dispatchOrders.diaDiemText,
      carrierId: dispatchOrders.carrierId,
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

  if (!order || order.carrierId !== carrierId) notFound();

  const assignments = await db
    .select()
    .from(dispatchVehicleAssignments)
    .where(eq(dispatchVehicleAssignments.dispatchOrderId, order.id));

  return (
    <main className="px-4 py-6 flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-bold text-slate-900 font-mono">{order.vtNumber}</h1>
        <p className="text-sm text-slate-500">{STATUS_LABEL[order.status]}</p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
        {order.loaiDon === "NHAP_HANG" && order.transferFromName && (
          <p>
            Nhận hàng từ <strong>{order.transferFromName}</strong> chuyển tới{" "}
            <strong>{order.transferToName}</strong>
          </p>
        )}
        {order.loaiDon === "LAY_HANG" && order.customerName && (
          <p>
            Lấy hàng giao cho khách: <strong>{order.customerName}</strong>
          </p>
        )}
        {order.diaDiemText && <p className="text-slate-500 mt-1">{order.diaDiemText}</p>}
      </div>

      {assignments.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
          <h2 className="font-semibold text-slate-900 mb-2">Xe đã đăng ký</h2>
          {assignments.map((a) => (
            <div key={a.id} className="flex justify-between py-1 border-t border-slate-100 first:border-t-0">
              <span className="font-mono">{a.soXe}</span>
              <span>{a.tenTaiXe}</span>
              <span>{a.daXacNhan ? "✅ Đã xác nhận" : "Chưa xác nhận"}</span>
            </div>
          ))}
        </div>
      )}

      {order.status === "CHO_DANG_KY" && <RegisterForm dispatchOrderId={order.id} />}

      {(order.status === "CHO_VAO_KHO" || order.status === "CHO_LAY_GIAO_HANG") && (
        <CompleteForm dispatchOrderId={order.id} />
      )}

      {order.status === "HOAN_THANH" && (
        <p className="text-sm text-emerald-700 bg-emerald-50 rounded-md px-4 py-3">
          Đơn vận tải đã hoàn thành. Cảm ơn bạn!
        </p>
      )}
    </main>
  );
}
