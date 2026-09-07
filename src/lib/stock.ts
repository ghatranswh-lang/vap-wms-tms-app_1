// Sổ cái tồn kho — nguồn sự thật duy nhất cho số dư tồn (StockBalance = SUM
// deltaQty group theo company/warehouse/zone/location/item/tthh/lot). Mọi
// module nghiệp vụ (Nhập kho, Chuyển kho, Xuất kho, Giải chấp...) phải ghi
// qua postStockLedger() thay vì tự ý update một bảng "tồn kho" nào khác.
import { db } from "@/db";
import { stockLedger, locations, items } from "@/db/schema";
import { eq, sql, and } from "drizzle-orm";
import type { InferInsertModel } from "drizzle-orm";

type LedgerEntry = Omit<
  InferInsertModel<typeof stockLedger>,
  "id" | "createdAt"
>;

export async function postStockLedger(entries: LedgerEntry[]) {
  if (entries.length === 0) return;
  await db.insert(stockLedger).values(entries);
}

/**
 * Ước tính số pallet tương ứng với 1 số lượng KG của 1 mặt hàng, dựa trên
 * trongLuongPallet = soBaoLop * soLopPallet * trongLuongBao (nếu mặt hàng đã
 * khai báo đủ 3 trường đóng gói). Làm tròn lên. Trả về null nếu thiếu dữ
 * liệu đóng gói — trong trường hợp đó KHÔNG tự động cập nhật currentPallets
 * (để tránh ghi sai số liệu sức chứa), thủ kho cần cập nhật tay tại Danh mục.
 */
export async function estimatePallets(
  itemId: number,
  soLuongKg: number
): Promise<number | null> {
  const [it] = await db.select().from(items).where(eq(items.id, itemId)).limit(1);
  if (!it || !it.soBaoLop || !it.soLopPallet || !it.trongLuongBao) return null;
  const trongLuongPallet =
    Number(it.trongLuongBao) * it.soBaoLop * it.soLopPallet;
  if (!trongLuongPallet) return null;
  return Math.ceil(soLuongKg / trongLuongPallet);
}

/** Cộng dồn (hoặc trừ) số pallet hiện tại của 1 vị trí — dùng khi nhập/xuất/chuyển. */
export async function adjustLocationPallets(
  locationId: number,
  deltaPallets: number
) {
  if (!deltaPallets) return;
  await db
    .update(locations)
    .set({ currentPallets: sql`${locations.currentPallets} + ${deltaPallets}` })
    .where(eq(locations.id, locationId));
}

/**
 * Tính tồn kho hiện có (SUM deltaQty) của 1 mặt hàng tại 1 vị trí cụ thể
 * (company + warehouse + zone + location + item), theo TTHH. Dùng để kiểm
 * tra đủ hàng trước khi cho phép Chuyển kho / Xuất kho trừ tồn ở nguồn —
 * tránh để tồn kho bị âm do chọn nhầm vị trí không có hàng.
 */
export async function getStockBalance(params: {
  companyId: number;
  warehouseId: number;
  zoneId?: number | null;
  locationId?: number | null;
  itemId: number;
  tthh?: string;
}): Promise<number> {
  const conditions = [
    eq(stockLedger.companyId, params.companyId),
    eq(stockLedger.warehouseId, params.warehouseId),
    eq(stockLedger.itemId, params.itemId),
  ];
  if (params.zoneId != null) conditions.push(eq(stockLedger.zoneId, params.zoneId));
  if (params.locationId != null)
    conditions.push(eq(stockLedger.locationId, params.locationId));
  if (params.tthh) conditions.push(eq(stockLedger.tthh, params.tthh as never));

  const [row] = await db
    .select({ total: sql<string>`coalesce(sum(${stockLedger.deltaQty}), 0)` })
    .from(stockLedger)
    .where(and(...conditions));
  return Number(row?.total ?? 0);
}
