"use server";

import { db } from "@/db";
import { purchaseOrders, purchaseOrderLines } from "@/db/schema";
import { hasPerm } from "@/lib/perm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { eq } from "drizzle-orm";

// Cùng hình dạng payload với src/app/(app)/mua-hang/moi/actions.ts (form Tạo
// PO) — tách riêng vì file "use server" chỉ được export hàm async, không
// export schema/helper dùng chung được.
const customFieldSchema = z.array(
  z.object({ key: z.string().min(1), value: z.string() })
);

const lineSchema = z.object({
  itemId: z.coerce.number().int().positive(),
  donGia: z.coerce.number().nonnegative(),
  qty: z.coerce.number().positive(),
  vatRate: z.coerce.number().min(0).max(100).default(0),
  tthh: z.enum(["HTC", "KTC", "DGC"]).default("KTC"),
  zoneId: z.coerce.number().int().positive().optional(),
  locationId: z.coerce.number().int().positive().optional(),
  custom: customFieldSchema.default([]),
});

const formSchema = z.object({
  companyId: z.coerce.number().int().positive(),
  supplierId: z.coerce.number().int().positive(),
  warehouseId: z.coerce.number().int().positive().optional(),
  currency: z.string().default("VND"),
  ghiChu: z.string().optional(),
  custom: customFieldSchema.default([]),
  lines: z.array(lineSchema).min(1, "Cần ít nhất 1 dòng hàng"),
});

export type PoFormState = { error?: string };

function customArrayToObject(arr: { key: string; value: string }[]) {
  const obj: Record<string, string> = {};
  for (const { key, value } of arr) {
    if (key.trim()) obj[key.trim()] = value;
  }
  return obj;
}

async function poHasReceipt(poId: number): Promise<boolean> {
  const lines = await db
    .select({ qty: purchaseOrderLines.qty, slChuaNhap: purchaseOrderLines.slChuaNhap })
    .from(purchaseOrderLines)
    .where(eq(purchaseOrderLines.poId, poId));
  return lines.some((l) => Number(l.slChuaNhap) < Number(l.qty) - 1e-6);
}

export async function updatePurchaseOrder(
  poId: number,
  _prev: PoFormState,
  formData: FormData
): Promise<PoFormState> {
  if (!(await hasPerm("mua_hang", "edit"))) {
    return { error: "Bạn không có quyền sửa đơn mua hàng (PO)." };
  }

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
      error:
        parsed.error.issues[0]?.message ||
        "Dữ liệu không hợp lệ — kiểm tra lại các dòng hàng.",
    };
  }

  if (await poHasReceipt(poId)) {
    return {
      error:
        "Đơn này đã có nhập kho — không thể sửa để tránh sai lệch tồn kho. Vui lòng tạo đơn mua hàng mới nếu cần điều chỉnh thêm.",
    };
  }

  const { companyId, supplierId, warehouseId, currency, ghiChu, custom, lines } =
    parsed.data;

  await db
    .update(purchaseOrders)
    .set({
      companyId,
      supplierId,
      warehouseId,
      currency,
      ghiChu,
      custom: customArrayToObject(custom),
    })
    .where(eq(purchaseOrders.id, poId));

  await db.delete(purchaseOrderLines).where(eq(purchaseOrderLines.poId, poId));
  await db.insert(purchaseOrderLines).values(
    lines.map((l) => ({
      poId,
      itemId: l.itemId,
      donGia: String(l.donGia),
      qty: String(l.qty),
      vatRate: String(l.vatRate),
      tthh: l.tthh,
      zoneId: l.zoneId,
      locationId: l.locationId,
      custom: customArrayToObject(l.custom),
      slChuaNhap: String(l.qty),
    }))
  );

  redirect(`/mua-hang/${poId}`);
}

export async function deletePurchaseOrder(poId: number) {
  if (!(await hasPerm("mua_hang", "delete"))) {
    redirect(`/mua-hang/${poId}?err=noperm`);
  }
  if (await poHasReceipt(poId)) {
    redirect(`/mua-hang/${poId}?err=received`);
  }
  await db.delete(purchaseOrders).where(eq(purchaseOrders.id, poId));
  redirect("/mua-hang");
}
