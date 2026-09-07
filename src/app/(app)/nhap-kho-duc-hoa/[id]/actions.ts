"use server";

import { db } from "@/db";
import { transferOrders, transferOrderLines, zones, warehouses } from "@/db/schema";
import { postStockLedger, estimatePallets, adjustLocationPallets } from "@/lib/stock";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";

const lineSchema = z.object({
  lineId: z.coerce.number().int().positive(),
  zoneToId: z.coerce.number().int().positive(),
  locationToId: z.coerce.number().int().positive(),
});

const formSchema = z.object({
  transferOrderId: z.coerce.number().int().positive(),
  lines: z.array(lineSchema).min(1),
});

export type NhapKhoDucHoaFormState = { error?: string };

export async function confirmDucHoaReceipt(
  _prev: NhapKhoDucHoaFormState,
  formData: FormData
): Promise<NhapKhoDucHoaFormState> {
  const raw = formData.get("payload");
  if (typeof raw !== "string") return { error: "Thiếu dữ liệu." };

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return { error: "Dữ liệu không hợp lệ." };
  }
  const parsed = formSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ." };
  }
  const data = parsed.data;

  const [order] = await db
    .select()
    .from(transferOrders)
    .where(eq(transferOrders.id, data.transferOrderId))
    .limit(1);
  if (!order) return { error: "Không tìm thấy phiếu chuyển kho." };
  if (order.status === "HOAN_TAT") {
    return { error: "Phiếu này đã được xác nhận nhận hàng rồi." };
  }

  const [whTo] = await db
    .select()
    .from(warehouses)
    .where(eq(warehouses.id, order.warehouseToId))
    .limit(1);
  if (!whTo || whTo.code !== "KHO-DUCHOA") {
    return { error: "Phiếu chuyển kho này không phải đến Kho Đức Hòa." };
  }

  const orderLines = await db
    .select()
    .from(transferOrderLines)
    .where(eq(transferOrderLines.transferOrderId, order.id));
  const lineById = new Map(orderLines.map((l) => [l.id, l]));

  // Mỗi dòng gốc của phiếu phải có đúng 1 lựa chọn vị trí nhận thật.
  if (data.lines.length !== orderLines.length) {
    return { error: "Thiếu vị trí nhận cho một số dòng hàng." };
  }

  const zoneCompanyCache = new Map<number, number>();
  for (const l of data.lines) {
    if (!lineById.has(l.lineId)) return { error: "Dữ liệu dòng hàng không hợp lệ." };
    if (!zoneCompanyCache.has(l.zoneToId)) {
      const [z] = await db.select().from(zones).where(eq(zones.id, l.zoneToId)).limit(1);
      if (!z) return { error: "Khu vực không hợp lệ." };
      zoneCompanyCache.set(l.zoneToId, z.companyId);
    }
  }

  // Cập nhật vị trí ĐÍCH THẬT (có thể khác dự kiến) trên từng dòng phiếu chuyển kho
  for (const l of data.lines) {
    await db
      .update(transferOrderLines)
      .set({ zoneToId: l.zoneToId, locationToId: l.locationToId })
      .where(eq(transferOrderLines.id, l.lineId));
  }

  // Cộng tồn kho ĐÍCH thật sự tại thời điểm này (chưa từng được cộng lúc tạo
  // phiếu chuyển kho, vì đích là Đức Hòa)
  await postStockLedger(
    data.lines.map((l) => {
      const orig = lineById.get(l.lineId)!;
      return {
        companyId: zoneCompanyCache.get(l.zoneToId)!,
        warehouseId: order.warehouseToId,
        zoneId: l.zoneToId,
        locationId: l.locationToId,
        itemId: orig.itemId,
        tthh: orig.tthh,
        lot: orig.lot,
        deltaQty: orig.soLuong,
        refType: "TRANSFER_IN" as const,
        refId: order.id,
      };
    })
  );

  for (const l of data.lines) {
    const orig = lineById.get(l.lineId)!;
    const pallets = await estimatePallets(orig.itemId, Number(orig.soLuong));
    if (pallets) await adjustLocationPallets(l.locationToId, pallets);
  }

  await db
    .update(transferOrders)
    .set({ status: "HOAN_TAT" })
    .where(eq(transferOrders.id, order.id));

  redirect(`/nhap-kho-duc-hoa/${order.id}`);
}
