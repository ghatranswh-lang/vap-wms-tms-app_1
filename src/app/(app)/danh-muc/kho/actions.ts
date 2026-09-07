"use server";

import { db } from "@/db";
import { warehouses } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({
  code: z.string().min(1).max(32),
  name: z.string().min(1),
  wms: z.boolean(),
  baoVe: z.boolean(),
  hienViTri: z.boolean(),
  diaChi: z.string().optional(),
  sdt: z.string().optional(),
});

export type WarehouseFormState = { error?: string };

export async function createWarehouse(
  _prevState: WarehouseFormState | undefined,
  formData: FormData
): Promise<WarehouseFormState> {
  const parsed = schema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    wms: formData.get("wms") === "on",
    baoVe: formData.get("baoVe") === "on",
    hienViTri: formData.get("hienViTri") === "on",
    diaChi: formData.get("diaChi") || undefined,
    sdt: formData.get("sdt") || undefined,
  });

  if (!parsed.success) {
    return { error: "Dữ liệu không hợp lệ — kiểm tra lại Mã kho và Tên kho." };
  }

  try {
    await db.insert(warehouses).values(parsed.data);
  } catch {
    return { error: "Mã kho đã tồn tại." };
  }

  revalidatePath("/danh-muc/kho");
  return {};
}
