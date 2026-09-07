"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { dispatchOrders, dispatchVehicleAssignments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";

async function requireDriverOrder(dispatchOrderId: number) {
  const session = await auth();
  const carrierId = (session?.user as unknown as { carrierId?: number | null })?.carrierId;
  if (!carrierId) throw new Error("Tài khoản chưa được gán đơn vị vận tải.");

  const [order] = await db
    .select()
    .from(dispatchOrders)
    .where(eq(dispatchOrders.id, dispatchOrderId))
    .limit(1);
  if (!order || order.carrierId !== carrierId) {
    throw new Error("Không tìm thấy đơn vận tải hoặc không thuộc đơn vị của bạn.");
  }
  return order;
}

const registerSchema = z.object({
  dispatchOrderId: z.coerce.number().int().positive(),
  soXe: z.string().min(1, "Cần nhập số xe"),
  tenTaiXe: z.string().min(1, "Cần nhập tên tài xế"),
  soCccd: z.string().optional(),
  qty: z.coerce.number().positive().optional(),
});

export type TaiXeFormState = { error?: string };

export async function registerVehicle(
  _prev: TaiXeFormState,
  formData: FormData
): Promise<TaiXeFormState> {
  const parsed = registerSchema.safeParse({
    dispatchOrderId: formData.get("dispatchOrderId"),
    soXe: formData.get("soXe"),
    tenTaiXe: formData.get("tenTaiXe"),
    soCccd: formData.get("soCccd") || undefined,
    qty: formData.get("qty") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ." };
  }
  const data = parsed.data;

  let order;
  try {
    order = await requireDriverOrder(data.dispatchOrderId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Lỗi không xác định." };
  }
  if (order.status !== "CHO_DANG_KY") {
    return { error: "Đơn này đã được đăng ký xe rồi." };
  }

  await db.insert(dispatchVehicleAssignments).values({
    dispatchOrderId: order.id,
    soXe: data.soXe,
    tenTaiXe: data.tenTaiXe,
    soCccd: data.soCccd,
    qty: data.qty != null ? String(data.qty) : undefined,
  });

  const nextStatus = order.loaiDon === "NHAP_HANG" ? "CHO_VAO_KHO" : "CHO_LAY_GIAO_HANG";
  await db.update(dispatchOrders).set({ status: nextStatus }).where(eq(dispatchOrders.id, order.id));

  redirect(`/tai-xe/${order.id}`);
}

const completeSchema = z.object({
  dispatchOrderId: z.coerce.number().int().positive(),
});

export async function confirmCompleted(
  _prev: TaiXeFormState,
  formData: FormData
): Promise<TaiXeFormState> {
  const parsed = completeSchema.safeParse({ dispatchOrderId: formData.get("dispatchOrderId") });
  if (!parsed.success) return { error: "Dữ liệu không hợp lệ." };

  let order;
  try {
    order = await requireDriverOrder(parsed.data.dispatchOrderId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Lỗi không xác định." };
  }
  if (order.status === "CHO_DANG_KY") {
    return { error: "Cần đăng ký xe trước khi xác nhận hoàn thành." };
  }
  if (order.status === "HOAN_THANH") {
    return { error: "Đơn này đã hoàn thành rồi." };
  }

  await db
    .update(dispatchVehicleAssignments)
    .set({ daXacNhan: true })
    .where(eq(dispatchVehicleAssignments.dispatchOrderId, order.id));
  await db
    .update(dispatchOrders)
    .set({ status: "HOAN_THANH" })
    .where(eq(dispatchOrders.id, order.id));

  redirect(`/tai-xe/${order.id}`);
}
