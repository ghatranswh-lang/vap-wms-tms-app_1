"use server";

import { db } from "@/db";
import {
  goodsReceipts,
  goodsReceiptLines,
  purchaseOrderLines,
  purchaseOrders,
  warehouses,
} from "@/db/schema";
import { nextDocNumber } from "@/lib/docNumber";
import { postStockLedger, estimatePallets, adjustLocationPallets } from "@/lib/stock";
import { eq, sql, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";

const lineSchema = z.object({
  poLineId: z.coerce.number().int().positive(),
  itemId: z.coerce.number().int().positive(),
  tthh: z.enum(["HTC", "KTC", "DGC"]),
  soLuong: z.coerce.number().positive(),
  zoneId: z.coerce.number().int().positive().optional(),
  locationId: z.coerce.number().int().positive().optional(),
  lot: z.string().optional(),
});

const formSchema = z.object({
  poId: z.coerce.number().int().positive(),
  warehouseId: z.coerce.number().int().positive(),
  lines: z.array(lineSchema).min(1, "Cần nhập ít nhất 1 dòng hàng"),
});

export type NhapKhoFormState = { error?: string };

export async function createGoodsReceipt(
  _prev: NhapKhoFormState,
  formData: FormData
): Promise<NhapKhoFormState> {
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
    return {
      error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ.",
    };
  }
  const { poId, warehouseId, lines } = parsed.data;

  const [po] = await db
    .select()
    .from(purchaseOrders)
    .where(eq(purchaseOrders.id, poId))
    .limit(1);
  if (!po) return { error: "Không tìm thấy PO." };

  const [wh] = await db
    .select()
    .from(warehouses)
    .where(eq(warehouses.id, warehouseId))
    .limit(1);
  if (!wh) return { error: "Không tìm thấy kho." };

  // Kiểm tra không nhập vượt quá số lượng còn thiếu của từng dòng PO
  const poLineIds = lines.map((l) => l.poLineId);
  const poLines = await db
    .select()
    .from(purchaseOrderLines)
    .where(inArray(purchaseOrderLines.id, poLineIds));
  const poLineMap = new Map(poLines.map((l) => [l.id, l]));
  for (const l of lines) {
    const poLine = poLineMap.get(l.poLineId);
    if (!poLine) return { error: "Dòng PO không hợp lệ." };
    if (l.soLuong > Number(poLine.slChuaNhap) + 1e-6) {
      return {
        error: `Số lượng nhập (${l.soLuong}) vượt quá số còn thiếu (${poLine.slChuaNhap}) của mã hàng.`,
      };
    }
    if (wh.wms && (!l.zoneId || !l.locationId)) {
      return { error: "Kho này có quản lý Khu vực/Vị trí — cần chọn đủ cho mỗi dòng." };
    }
  }

  const grnNumber = await nextDocNumber(goodsReceipts.grnNumber, "GRN");

  const [receipt] = await db
    .insert(goodsReceipts)
    .values({
      grnNumber,
      sourceType: "PO",
      poId,
      warehouseId,
      ngayNhap: new Date().toISOString().slice(0, 10),
    })
    .returning();

  await db.insert(goodsReceiptLines).values(
    lines.map((l) => ({
      receiptId: receipt.id,
      itemId: l.itemId,
      soLuong: String(l.soLuong),
      zoneId: l.zoneId,
      locationId: l.locationId,
      tthh: l.tthh,
      lot: l.lot,
    }))
  );

  // Trừ số lượng chưa nhập trên từng dòng PO
  for (const l of lines) {
    await db
      .update(purchaseOrderLines)
      .set({
        slChuaNhap: sql`${purchaseOrderLines.slChuaNhap} - ${l.soLuong}`,
      })
      .where(eq(purchaseOrderLines.id, l.poLineId));
  }

  // Ghi sổ cái tồn kho (tăng)
  await postStockLedger(
    lines.map((l) => ({
      companyId: po.companyId,
      warehouseId,
      zoneId: l.zoneId,
      locationId: l.locationId,
      itemId: l.itemId,
      tthh: l.tthh,
      lot: l.lot,
      deltaQty: String(l.soLuong),
      refType: "PO_RECEIPT" as const,
      refId: receipt.id,
    }))
  );

  // Ước tính + cộng dồn số pallet tại vị trí nhận (best-effort, có thể null)
  for (const l of lines) {
    if (!l.locationId) continue;
    const pallets = await estimatePallets(l.itemId, l.soLuong);
    if (pallets) await adjustLocationPallets(l.locationId, pallets);
  }

  redirect(`/nhap-kho/${receipt.id}`);
}
