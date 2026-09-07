"use server";

import { db } from "@/db";
import { items } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const numOpt = z
  .union([z.string(), z.undefined()])
  .transform((v) => (v ? v : undefined));

const schema = z.object({
  maHang: z.string().min(1).max(64),
  tenHang: z.string().min(1),
  baseUnit: z.string().min(1).default("KG"),
  giaBan: numOpt,
  trongLuongBao: numOpt,
  soBaoLop: numOpt,
  soLopPallet: numOpt,
  daiPallet: numOpt,
  rongPallet: numOpt,
  caoPallet: numOpt,
});

export type ItemFormState = { error?: string };

export async function createItem(
  _prevState: ItemFormState | undefined,
  formData: FormData
): Promise<ItemFormState> {
  const parsed = schema.safeParse({
    maHang: formData.get("maHang"),
    tenHang: formData.get("tenHang"),
    baseUnit: formData.get("baseUnit") || "KG",
    giaBan: formData.get("giaBan") || undefined,
    trongLuongBao: formData.get("trongLuongBao") || undefined,
    soBaoLop: formData.get("soBaoLop") || undefined,
    soLopPallet: formData.get("soLopPallet") || undefined,
    daiPallet: formData.get("daiPallet") || undefined,
    rongPallet: formData.get("rongPallet") || undefined,
    caoPallet: formData.get("caoPallet") || undefined,
  });

  if (!parsed.success) {
    return { error: "Dữ liệu không hợp lệ — kiểm tra lại Mã hàng và Tên hàng." };
  }

  const d = parsed.data;
  try {
    await db.insert(items).values({
      maHang: d.maHang,
      tenHang: d.tenHang,
      baseUnit: d.baseUnit,
      giaBan: d.giaBan,
      trongLuongBao: d.trongLuongBao,
      soBaoLop: d.soBaoLop ? Number(d.soBaoLop) : undefined,
      soLopPallet: d.soLopPallet ? Number(d.soLopPallet) : undefined,
      daiPallet: d.daiPallet,
      rongPallet: d.rongPallet,
      caoPallet: d.caoPallet,
    });
  } catch {
    return { error: "Mã hàng đã tồn tại." };
  }

  revalidatePath("/danh-muc/mat-hang");
  return {};
}
