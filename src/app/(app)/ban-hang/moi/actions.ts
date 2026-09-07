"use server";

import { db } from "@/db";
import { salesOrders, salesOrderLines } from "@/db/schema";
import { nextDocNumber } from "@/lib/docNumber";
import { redirect } from "next/navigation";
import { z } from "zod";

const lineSchema = z.object({
  itemId: z.coerce.number().int().positive(),
  ngayGiaoDuKien: z.string().min(1, "Cần chọn ngày giao dự kiến"),
  donGia: z.coerce.number().nonnegative(),
  soLuongDat: z.coerce.number().positive(),
  khoXuatDuKienId: z.coerce.number().int().positive().optional(),
});

const formSchema = z.object({
  customerId: z.coerce.number().int().positive(),
  companyId: z.coerce.number().int().positive(),
  ghiChu: z.string().optional(),
  lines: z.array(lineSchema).min(1, "Cần ít nhất 1 dòng hàng"),
});

export type SoFormState = { error?: string };

export async function createSalesOrder(
  _prev: SoFormState,
  formData: FormData
): Promise<SoFormState> {
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
      error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ — kiểm tra lại các dòng hàng.",
    };
  }

  const { customerId, companyId, ghiChu, lines } = parsed.data;

  const soNumber = await nextDocNumber(salesOrders.soNumber, "SO");

  const [so] = await db
    .insert(salesOrders)
    .values({ soNumber, customerId, companyId, ghiChu })
    .returning();

  await db.insert(salesOrderLines).values(
    lines.map((l) => ({
      soId: so.id,
      ngayGiaoDuKien: l.ngayGiaoDuKien,
      itemId: l.itemId,
      donGia: String(l.donGia),
      soLuongDat: String(l.soLuongDat),
      khoXuatDuKienId: l.khoXuatDuKienId,
      slDaXuat: "0",
    }))
  );

  redirect(`/ban-hang/${so.id}`);
}
