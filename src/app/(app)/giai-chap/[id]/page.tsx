import { db } from "@/db";
import { collateralReleases, companies, warehouses, zones, locations, items } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import ConfirmButton from "./ConfirmButton";

export default async function GiaiChapDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const rowId = Number(id);

  const [row] = await db
    .select({
      id: collateralReleases.id,
      hsgc: collateralReleases.hsgc,
      ngay: collateralReleases.ngay,
      soLuongTan: collateralReleases.soLuongTan,
      boCt: collateralReleases.boCt,
      ghiChu: collateralReleases.ghiChu,
      trangThai: collateralReleases.trangThai,
      source: collateralReleases.source,
      companyCode: companies.code,
      companyName: companies.name,
      warehouseName: warehouses.name,
      zoneName: zones.name,
      locationName: locations.name,
      maHang: items.maHang,
      tenHang: items.tenHang,
    })
    .from(collateralReleases)
    .innerJoin(companies, eq(companies.id, collateralReleases.companyId))
    .innerJoin(warehouses, eq(warehouses.id, collateralReleases.warehouseId))
    .leftJoin(zones, eq(zones.id, collateralReleases.zoneId))
    .leftJoin(locations, eq(locations.id, collateralReleases.locationId))
    .innerJoin(items, eq(items.id, collateralReleases.itemId))
    .where(eq(collateralReleases.id, rowId))
    .limit(1);

  if (!row) notFound();

  return (
    <main className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-baseline justify-between mb-1">
        <h1 className="text-xl font-bold text-slate-900">{row.hsgc}</h1>
        {row.trangThai === "HOAN_TAT" ? (
          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-xs font-semibold">
            Hoàn tất
          </span>
        ) : (
          <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full text-xs font-semibold">
            Nháp
          </span>
        )}
      </div>
      <p className="text-sm text-slate-500 mb-6">{row.ngay}</p>

      <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm space-y-2 mb-6">
        <div className="flex justify-between">
          <span className="text-slate-500">Công ty</span>
          <span>
            {row.companyCode} — {row.companyName}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Kho / Vị trí</span>
          <span>
            {row.warehouseName}
            {row.zoneName ? ` · ${row.zoneName} · ${row.locationName}` : ""}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Mã hàng</span>
          <span className="font-mono">
            {row.maHang} — {row.tenHang}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Số lượng</span>
          <span>{Number(row.soLuongTan).toLocaleString("vi-VN")} Tấn</span>
        </div>
        {row.boCt && (
          <div className="flex justify-between">
            <span className="text-slate-500">Bộ chứng từ</span>
            <span>{row.boCt}</span>
          </div>
        )}
        {row.ghiChu && (
          <div className="flex justify-between">
            <span className="text-slate-500">Ghi chú</span>
            <span>{row.ghiChu}</span>
          </div>
        )}
      </div>

      {row.trangThai === "NHAP" ? (
        <>
          <p className="text-xs text-amber-700 bg-amber-50 rounded-md px-3 py-2 mb-3">
            Khi hoàn tất, hệ thống chuyển TTHH của số lượng này từ HTC sang DGC tại
            đúng vị trí đã chọn.
          </p>
          <ConfirmButton id={row.id} />
        </>
      ) : (
        <p className="text-sm text-emerald-700">
          Đã giải chấp — TTHH đã chuyển thành DGC.
        </p>
      )}
    </main>
  );
}
