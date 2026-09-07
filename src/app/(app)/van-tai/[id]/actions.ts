"use server";

import { db } from "@/db";
import { dispatchOrders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";

const schema = z.object({
  dispatchOrderId: z.coerce.number().int().positive(),
  carrierId: z.coerce.number().int().positive(),
  cuocVanChuyen: z.coerce.number().nonnegative().optional(),
});

export type AssignCarrierState = { error?: string };

export async function assignCarrier(
  _prev: AssignCarrierState,
  formData: FormData
): Promise<AssignCarrierState> {
  const parsed = schema.safeParse({
    dispatchOrderId: formData.get("dispatchOrderId"),
    carrierId: formData.get("carrierId"),
    cuocVanChuyen: formData.get("cuocVanChuyen") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ." };
  }
  const data = parsed.data;

  await db
    .update(dispatchOrders)
    .set({
      carrierId: data.carrierId,
      cuocVanChuyen: data.cuocVanChuyen != null ? String(data.cuocVanChuyen) : undefined,
    })
    .where(eq(dispatchOrders.id, data.dispatchOrderId));

  redirect(`/van-tai/${data.dispatchOrderId}`);
}
