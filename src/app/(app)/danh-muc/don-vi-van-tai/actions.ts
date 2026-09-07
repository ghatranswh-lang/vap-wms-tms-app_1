"use server";

import { db } from "@/db";
import { carriers } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";

const schema = z.object({
  name: z.string().min(1, "Cần nhập tên đơn vị vận tải."),
  is3pl: z.boolean(),
  xeNoiBo: z.boolean(),
  khTuLay: z.boolean(),
  xemCuoc: z.boolean(),
});

export type CarrierFormState = { error?: string };

export async function createCarrier(
  _prevState: CarrierFormState | undefined,
  formData: FormData
): Promise<CarrierFormState> {
  const parsed = schema.safeParse({
    name: formData.get("name"),
    is3pl: formData.get("is3pl") === "on",
    xeNoiBo: formData.get("xeNoiBo") === "on",
    khTuLay: formData.get("khTuLay") === "on",
    xemCuoc: formData.get("xemCuoc") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ." };
  }

  await db.insert(carriers).values(parsed.data);

  revalidatePath("/danh-muc/don-vi-van-tai");
  return {};
}

export async function toggleCarrierActive(id: number, active: boolean) {
  await db.update(carriers).set({ active }).where(eq(carriers.id, id));
  revalidatePath("/danh-muc/don-vi-van-tai");
}
