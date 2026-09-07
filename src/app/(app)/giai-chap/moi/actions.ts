"use server";

import { db } from "@/db";
import { collateralReleases } from "@/db/schema";
import { nextDocNumber } from "@/lib/docNumber";
import { redirect } from "next/navigation";
import { z } from "zod";

const formSchema = z.object({
  companyId: z.coerce.number().int().positive(),
  warehouseId: z.coerce.number().int().positive(),
  zoneId: z.coerce.number().int().positive().optional(),
  locationId: z.coerce.number().int().positive().optional(),
  itemId: z.coerce.number().int().positive(),
  soLuongTan: z.coerce.number().positive(),
  boCt: z.string().optional(),
  ghiChu: z.string().optional(),
});

export type GiaiChapFormState = { error?: string };

export async function createCollateralRelease(
  _prev: GiaiChapFormState,
  formData: FormData
): Promise<GiaiChapFormState> {
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
    return { error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ." };
  }
  const data = parsed.data;

  const hsgc = await nextDocNumber(collateralReleases.hsgc, "HSGC");

  const [row] = await db
    .insert(collateralReleases)
    .values({
      hsgc,
      ngay: new Date().toISOString().slice(0, 10),
      companyId: data.companyId,
      warehouseId: data.warehouseId,
      zoneId: data.zoneId,
      locationId: data.locationId,
      itemId: data.itemId,
      soLuongTan: String(data.soLuongTan),
      boCt: data.boCt,
      ghiChu: data.ghiChu,
      trangThai: "NHAP",
      source: "MANUAL",
    })
    .returning();

  redirect(`/giai-chap/${row.id}`);
}
