"use server";

import { db } from "@/db";
import {
  transferOrders,
  transferOrderLines,
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
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";

const lineSchema = z.object({
  itemId: z.coerce.number().int().positive(),
  soLuong: z.coerce.number().positive(),
  tthh: z.enum(["HTC", "KTC", "DGC"]),
  lot: z.string().optional(),
  zoneFromId: z.coerce.number().int().positive().optional(),
  locationFromId: z.coerce.number().int().positive().optional(),
  zoneToId: z.coerce.number().int().positive().optional(),
  locationToId: z.coerce.number().int().positive().optional(),
});

const formSchema = z.object({
  warehouseFromId: z.coerce.number().int().positive(),
  warehouseToId: z.coerce.number().int().positive(),
  donViVanTai: z.string().optional(),
  soXe: z.string().min(1, "Cần nhập số xe"),
  tenTaiXe: z.string().min(1, "Cần nhập tên tài xế"),
  soCccd: z.string().min(1, "Cần nhập số CCCD"),
  lines: z.array(lineSchema).min(1, "Cần ít nhất 1 dòng hàng"),
});

export type ChuyenKhoFormState = { error?: string };

export async function createTransferOrder(
  _prev: ChuyenKhoFormState,
  formData: FormData
): Promise<ChuyenKhoFormState> {
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

  if (data.warehouseFromId === data.warehouseToId) {
    return { error: "Kho đi và kho đến không được trùng nhau." };
  }

  const [whFrom] = await db
    .select()
    .from(warehouses)
    .where(eq(warehouses.id, data.warehouseFromId))
    .limit(1);
  const [whTo] = await db
    .select()
    .from(warehouses)
    .where(eq(warehouses.id, data.warehouseToId))
    .limit(1);
  if (!whFrom || !whTo) return { error: "Kho không hợp lệ." };

  for (const l of data.lines) {
    if (whFrom.wms && (!l.zoneFromId || !l.locationFromId)) {
      return { error: "Kho đi có quản lý Khu vực/Vị trí — cần chọn đủ cho mỗi dòng." };
    }
    if (whTo.wms && (!l.zoneToId || !l.locationToId)) {
      return { error: "Kho đến có quản lý Khu vực/Vị trí — cần chọn đủ cho mỗi dòng." };
    }
  }

  // Kiểm tra đủ tồn kho tại nguồn trước khi cho tạo phiếu — tránh trừ tồn
  // thành âm khi chọn nhầm khu vực/vị trí không có (đủ) hàng.
  const zoneCompanyCacheCheck = new Map<number, number>();
  for (const l of data.lines) {
    if (!l.zoneFromId) continue;
    if (!zoneCompanyCacheCheck.has(l.zoneFromId)) {
      const [z] = await db.select().from(zones).where(eq(zones.id, l.zoneFromId)).limit(1);
      if (z) zoneCompanyCacheCheck.set(l.zoneFromId, z.companyId);
    }
    const companyId = zoneCompanyCacheCheck.get(l.zoneFromId);
    if (!companyId) continue;
    const available = await getStockBalance({
      companyId,
      warehouseId: data.warehouseFromId,
      zoneId: l.zoneFromId,
      locationId: l.locationFromId,
      itemId: l.itemId,
      tthh: l.tthh,
    });
    if (available < l.soLuong) {
      return {
        error: `Không đủ tồn kho tại vị trí nguồn cho mặt hàng đã chọn (còn ${available.toLocaleString(
          "vi-VN"
        )} KG, cần ${l.soLuong.toLocaleString("vi-VN")} KG).`,
      };
    }
  }

  const isToDucHoa = whTo.code === "KHO-DUCHOA";
  const ckNumber = await nextDocNumber(transferOrders.ckNumber, "CK");

  const [order] = await db
    .insert(transferOrders)
    .values({
      ckNumber,
      warehouseFromId: data.warehouseFromId,
      warehouseToId: data.warehouseToId,
      donViVanTai: data.donViVanTai,
      soXe: data.soXe,
      tenTaiXe: data.tenTaiXe,
      soCccd: data.soCccd,
      // Hàng đi Đức Hòa: chờ nhận mới Hoàn tất. Đi kho khác: coi như hoàn tất
      // ngay (không có bước xác nhận nhận hàng riêng).
      status: isToDucHoa ? "DANG_CHUYEN" : "HOAN_TAT",
    })
    .returning();

  await db.insert(transferOrderLines).values(
    data.lines.map((l) => ({
      transferOrderId: order.id,
      itemId: l.itemId,
      soLuong: String(l.soLuong),
      tthh: l.tthh,
      lot: l.lot,
      zoneFromId: l.zoneFromId,
      locationFromId: l.locationFromId,
      zoneToId: l.zoneToId,
      locationToId: l.locationToId,
    }))
  );

  // Trừ tồn kho tại NGUỒN ngay lập tức (hàng coi như đã rời khỏi vị trí đó)
  const zoneFromCompanyCache = new Map<number, number>();
  for (const l of data.lines) {
    if (!l.zoneFromId) continue;
    if (!zoneFromCompanyCache.has(l.zoneFromId)) {
      const [z] = await db.select().from(zones).where(eq(zones.id, l.zoneFromId)).limit(1);
      if (z) zoneFromCompanyCache.set(l.zoneFromId, z.companyId);
    }
  }
  await postStockLedger(
    data.lines
      .filter((l) => l.zoneFromId && zoneFromCompanyCache.has(l.zoneFromId))
      .map((l) => ({
        companyId: zoneFromCompanyCache.get(l.zoneFromId!)!,
        warehouseId: data.warehouseFromId,
        zoneId: l.zoneFromId,
        locationId: l.locationFromId,
        itemId: l.itemId,
        tthh: l.tthh,
        lot: l.lot,
        deltaQty: String(-l.soLuong),
        refType: "TRANSFER_OUT" as const,
        refId: order.id,
      }))
  );
  for (const l of data.lines) {
    if (!l.locationFromId) continue;
    const pallets = await estimatePallets(l.itemId, l.soLuong);
    if (pallets) await adjustLocationPallets(l.locationFromId, -pallets);
  }

  // Nếu KHÔNG đi Đức Hòa: cộng tồn kho đích ngay (không cần bước nhận riêng)
  if (!isToDucHoa) {
    const zoneToCompanyCache = new Map<number, number>();
    for (const l of data.lines) {
      if (!l.zoneToId) continue;
      if (!zoneToCompanyCache.has(l.zoneToId)) {
        const [z] = await db.select().from(zones).where(eq(zones.id, l.zoneToId)).limit(1);
        if (z) zoneToCompanyCache.set(l.zoneToId, z.companyId);
      }
    }
    await postStockLedger(
      data.lines.map((l) => ({
        // Nếu kho đến không WMS (không có zone), quy ước dùng công ty của
        // zone nguồn (thường cùng công ty di chuyển nội bộ).
        companyId: l.zoneToId
          ? zoneToCompanyCache.get(l.zoneToId)!
          : zoneFromCompanyCache.get(l.zoneFromId!)!,
        warehouseId: data.warehouseToId,
        zoneId: l.zoneToId,
        locationId: l.locationToId,
        itemId: l.itemId,
        tthh: l.tthh,
        lot: l.lot,
        deltaQty: String(l.soLuong),
        refType: "TRANSFER_IN" as const,
        refId: order.id,
      }))
    );
    for (const l of data.lines) {
      if (!l.locationToId) continue;
      const pallets = await estimatePallets(l.itemId, l.soLuong);
      if (pallets) await adjustLocationPallets(l.locationToId, pallets);
    }
  }

  // Tự tạo đơn vận tải "nhận hàng" (chờ đăng ký) — theo đúng luồng mockup gốc
  const vtNumber = await nextDocNumber(dispatchOrders.vtNumber, "VT");
  await db.insert(dispatchOrders).values({
    vtNumber,
    loaiDon: "NHAP_HANG",
    sourceTransferOrderId: order.id,
    status: "CHO_DANG_KY",
  });

  redirect(`/chuyen-kho/${order.id}`);
}
