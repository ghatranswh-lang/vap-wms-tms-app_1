"use server";

import { db } from "@/db";
import { purchaseOrders, purchaseOrderLines } from "@/db/schema";
import { nextDocNumber } from "@/lib/docNumber";
import { redirect } from "next/navigation";
import { z } from "zod";

const lineSchema = z.object({
  itemId: z.coerce.number().int().positive(),
  donGia: z.coerce.number().nonnegative(),
  qty: z.coerce.number().positive(),
  vatRate: z.coerce.number().min(0).max(100).default(0),
  tthh: z.enum(["HTC", "KTC", "DGC"]).default("KTC"),
});

const formSchema = z.object({
  companyId: z.coerce.number().int().positive(),
  supplierId: z.coerce.number().int().positive(),
  zoneId: z.coerce.number().int().positive().optional(),
  currency: z.string().default("VND"),
  ghiChu: z.string().optional(),
  lines: z.array(lineSchema).min(1, "Cần ít nhất 1 dòng hàng"),
});

export type PoFormState = { error?: string };

export async function createPurchaseOrder(
  _prev: PoFormState,
  formData: FormData
): Promise<PoFormState> {
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
        parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ — kiểm tra lại các dòng hàng.",
    };
  }

  const { companyId, supplierId, zoneId, currency, ghiChu, lines } =
    parsed.data;

  const poNumber = await nextDocNumber(purchaseOrders.poNumber, "PO");

  const [po] = await db
    .insert(purchaseOrders)
    .values({
      poNumber,
      createdDate: new Date().toISOString().slice(0, 10),
      companyId,
      supplierId,
      zoneId,
      currency,
      ghiChu,
    })
    .returning();

  await db.insert(purchaseOrderLines).values(
    lines.map((l) => ({
      poId: po.id,
      itemId: l.itemId,
      donGia: String(l.donGia),
      qty: String(l.qty),
      vatRate: String(l.vatRate),
      tthh: l.tthh,
      slChuaNhap: String(l.qty),
    }))
  );

  redirect(`/mua-hang/${po.id}`);
}
