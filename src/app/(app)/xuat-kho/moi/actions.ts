"use server";

import { db } from "@/db";
import {
  goodsIssues,
  goodsIssueLines,
  goodsIssueSoLinks,
  salesOrderLines,
  warehouses,
  zones,
  dispatchOrders,
} from "@/db/schema";
import { nextDocNumber } from "@/lib/docNumber";
import {
  postStockLedger,
  estimatePallets,
  adjustLocationPallets,
  getStockBalance,
} from "@/lib/stock";
import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";

const lineSchema = z.object({
  soLineId: z.coerce.number().int().positive(),
  itemId: z.coerce.number().int().positive(),
  soLuong: z.coerce.number().positive(),
  tthh: z.enum(["HTC", "KTC", "DGC"]),
  warehouseId: z.coerce.number().int().positive(),
  zoneId: z.coerce.number().int().positive().optional(),
  locationId: z.coerce.number().int().positive().optional(),
});

const formSchema = z.object({
  soId: z.coerce.number().int().positive(),
  customerId: z.coerce.number().int().positive(),
  ngayXuat: z.string().min(1),
  donViVanTai: z.string().optional(),
  soXe: z.string().optional(),
  tenTaiXe: z.string().optional(),
  lines: z.array(lineSchema).min(1, "Cần ít nhất 1 dòng hàng"),
});

export type XuatKhoFormState = { error?: string };

export async function createGoodsIssue(
  _prev: XuatKhoFormState,
  formData: FormData
): Promise<XuatKhoFormState> {
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

  // Kiểm tra số lượng còn lại trên từng dòng SO (chống xuất vượt số lượng đặt
  // nếu người dùng mở 2 tab / hoặc SO đã bị xuất bớt từ lúc mở form).
  for (const l of data.lines) {
    const [soLine] = await db
      .select()
      .from(salesOrderLines)
      .where(eq(salesOrderLines.id, l.soLineId))
      .limit(1);
    if (!soLine) return { error: "Dòng đơn bán hàng không hợp lệ." };
    const remain = Number(soLine.soLuongDat) - Number(soLine.slDaXuat);
    if (l.soLuong > remain) {
      return {
        error: `Số lượng xuất vượt quá số lượng còn lại của đơn bán hàng (còn ${remain.toLocaleString(
          "vi-VN"
        )} KG).`,
      };
    }
  }

  const zoneCompanyCache = new Map<number, number>();
  for (const l of data.lines) {
    const [wh] = await db.select().from(warehouses).where(eq(warehouses.id, l.warehouseId)).limit(1);
    if (!wh) return { error: "Kho xuất không hợp lệ." };
    if (wh.wms && (!l.zoneId || !l.locationId)) {
      return { error: "Kho xuất có quản lý Khu vực/Vị trí — cần chọn đủ cho mỗi dòng." };
    }
    if (l.zoneId) {
      if (!zoneCompanyCache.has(l.zoneId)) {
        const [z] = await db.select().from(zones).where(eq(zones.id, l.zoneId)).limit(1);
        if (!z) return { error: "Khu vực không hợp lệ." };
        zoneCompanyCache.set(l.zoneId, z.companyId);
      }
      const companyId = zoneCompanyCache.get(l.zoneId)!;
      const available = await getStockBalance({
        companyId,
        warehouseId: l.warehouseId,
        zoneId: l.zoneId,
        locationId: l.locationId,
        itemId: l.itemId,
        tthh: l.tthh,
      });
      if (available < l.soLuong) {
        return {
          error: `Không đủ tồn kho tại vị trí đã chọn cho mặt hàng xuất (còn ${available.toLocaleString(
            "vi-VN"
          )} KG, cần ${l.soLuong.toLocaleString("vi-VN")} KG).`,
        };
      }
    }
  }

  const pxkNumber = await nextDocNumber(goodsIssues.pxkNumber, "PXK");

  const [gi] = await db
    .insert(goodsIssues)
    .values({
      pxkNumber,
      ngayXuat: data.ngayXuat,
      customerId: data.customerId,
      donViVanTai: data.donViVanTai,
      soXe: data.soXe,
      tenTaiXe: data.tenTaiXe,
    })
    .returning();

  await db.insert(goodsIssueSoLinks).values({ goodsIssueId: gi.id, salesOrderId: data.soId });

  await db.insert(goodsIssueLines).values(
    data.lines.map((l) => ({
      goodsIssueId: gi.id,
      soLineId: l.soLineId,
      itemId: l.itemId,
      soLuong: String(l.soLuong),
      tthh: l.tthh,
      warehouseId: l.warehouseId,
      zoneId: l.zoneId,
      locationId: l.locationId,
    }))
  );

  // Trừ tồn kho xuất — nguồn sự thật duy nhất là stock_ledger
  await postStockLedger(
    data.lines
      .filter((l) => l.zoneId)
      .map((l) => ({
        companyId: zoneCompanyCache.get(l.zoneId!)!,
        warehouseId: l.warehouseId,
        zoneId: l.zoneId,
        locationId: l.locationId,
        itemId: l.itemId,
        tthh: l.tthh,
        deltaQty: String(-l.soLuong),
        refType: "GOODS_ISSUE" as const,
        refId: gi.id,
      }))
  );
  for (const l of data.lines) {
    if (!l.locationId) continue;
    const pallets = await estimatePallets(l.itemId, l.soLuong);
    if (pallets) await adjustLocationPallets(l.locationId, -pallets);
  }

  // Cộng dồn số lượng đã xuất trên từng dòng SO
  for (const l of data.lines) {
    await db
      .update(salesOrderLines)
      .set({ slDaXuat: sql`${salesOrderLines.slDaXuat} + ${String(l.soLuong)}` })
      .where(eq(salesOrderLines.id, l.soLineId));
  }

  // Tự tạo đơn vận tải "lấy hàng giao khách" (chờ đăng ký) — theo đúng luồng
  // mockup gốc, tương tự Chuyển kho tự tạo VT nhận hàng.
  const vtNumber = await nextDocNumber(dispatchOrders.vtNumber, "VT");
  await db.insert(dispatchOrders).values({
    vtNumber,
    loaiDon: "LAY_HANG",
    sourceGoodsIssueId: gi.id,
    status: "CHO_DANG_KY",
  });

  redirect(`/xuat-kho/${gi.id}`);
}
