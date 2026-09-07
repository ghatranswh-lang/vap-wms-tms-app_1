"use server";

import { db } from "@/db";
import { collateralReleases } from "@/db/schema";
import { postStockLedger, getStockBalance } from "@/lib/stock";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";

const idSchema = z.coerce.number().int().positive();

export type ConfirmGiaiChapState = { error?: string };

/**
 * Hoàn tất hồ sơ giải chấp: chuyển TTHH của đúng số lượng này từ HTC (Hàng
 * thế chấp) sang DGC (Đã giải chấp) — LUÔN LUÔN thành DGC, bất kể ở kho nào
 * (quyết định nghiệp vụ đã chốt). Thực hiện bằng 2 bút toán sổ cái đối ứng
 * tại cùng 1 vị trí (không đổi số lượng tồn thực tế, chỉ đổi TTHH).
 */
export async function confirmCollateralRelease(
  _prev: ConfirmGiaiChapState,
  formData: FormData
): Promise<ConfirmGiaiChapState> {
  const parsedId = idSchema.safeParse(formData.get("id"));
  if (!parsedId.success) return { error: "ID không hợp lệ." };
  const id = parsedId.data;

  const [row] = await db.select().from(collateralReleases).where(eq(collateralReleases.id, id)).limit(1);
  if (!row) return { error: "Không tìm thấy hồ sơ giải chấp." };
  if (row.trangThai === "HOAN_TAT") return { error: "Hồ sơ này đã hoàn tất rồi." };

  const qtyKg = Number(row.soLuongTan) * 1000;

  const availableHtc = await getStockBalance({
    companyId: row.companyId,
    warehouseId: row.warehouseId,
    zoneId: row.zoneId ?? undefined,
    locationId: row.locationId ?? undefined,
    itemId: row.itemId,
    tthh: "HTC",
  });
  if (availableHtc < qtyKg) {
    return {
      error: `Không đủ tồn kho HTC (hàng thế chấp) tại vị trí này để giải chấp (còn ${availableHtc.toLocaleString(
        "vi-VN"
      )} KG, cần ${qtyKg.toLocaleString("vi-VN")} KG).`,
    };
  }

  await postStockLedger([
    {
      companyId: row.companyId,
      warehouseId: row.warehouseId,
      zoneId: row.zoneId,
      locationId: row.locationId,
      itemId: row.itemId,
      tthh: "HTC",
      deltaQty: String(-qtyKg),
      refType: "COLLATERAL_RELEASE",
      refId: row.id,
    },
    {
      companyId: row.companyId,
      warehouseId: row.warehouseId,
      zoneId: row.zoneId,
      locationId: row.locationId,
      itemId: row.itemId,
      tthh: "DGC",
      deltaQty: String(qtyKg),
      refType: "COLLATERAL_RELEASE",
      refId: row.id,
    },
  ]);

  await db
    .update(collateralReleases)
    .set({ trangThai: "HOAN_TAT" })
    .where(eq(collateralReleases.id, row.id));

  redirect(`/giai-chap/${row.id}`);
}
