"use server";

import { db } from "@/db";
import { companies } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";

const schema = z.object({
  code: z.string().min(1).max(32),
  name: z.string().min(1),
  isInternal: z.boolean(),
  mst: z.string().optional(),
  diaChi: z.string().optional(),
});

export async function createCompany(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const parsed = schema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    isInternal: formData.get("isInternal") === "on",
    mst: formData.get("mst") || undefined,
    diaChi: formData.get("diaChi") || undefined,
  });

  if (!parsed.success) {
    return { error: "Dữ liệu không hợp lệ — kiểm tra lại Mã và Tên." };
  }

  try {
    await db.insert(companies).values(parsed.data);
  } catch {
    return { error: "Mã công ty đã tồn tại." };
  }

  revalidatePath("/danh-muc/cong-ty");
  return {};
}

export async function toggleCompanyActive(id: number, active: boolean) {
  await db.update(companies).set({ active }).where(eq(companies.id, id));
  revalidatePath("/danh-muc/cong-ty");
}
