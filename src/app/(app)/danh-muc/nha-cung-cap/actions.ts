"use server";

import { db } from "@/db";
import { suppliers } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({
  maNcc: z.string().min(1).max(32),
  name: z.string().min(1),
  mst: z.string().optional(),
  diaChi: z.string().optional(),
});

export type SupplierFormState = { error?: string };

export async function createSupplier(
  _prevState: SupplierFormState | undefined,
  formData: FormData
): Promise<SupplierFormState> {
  const parsed = schema.safeParse({
    maNcc: formData.get("maNcc"),
    name: formData.get("name"),
    mst: formData.get("mst") || undefined,
    diaChi: formData.get("diaChi") || undefined,
  });

  if (!parsed.success) {
    return { error: "Dữ liệu không hợp lệ — kiểm tra lại Mã NCC và Tên." };
  }

  try {
    await db.insert(suppliers).values(parsed.data);
  } catch {
    return { error: "Mã nhà cung cấp đã tồn tại." };
  }

  revalidatePath("/danh-muc/nha-cung-cap");
  return {};
}
