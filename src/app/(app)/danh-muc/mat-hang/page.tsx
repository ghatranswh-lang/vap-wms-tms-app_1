import { db } from "@/db";
import { items } from "@/db/schema";
import ItemForm from "./ItemForm";

function formatMoney(v: string | null) {
  if (!v) return "—";
  return Number(v).toLocaleString("vi-VN") + " đ";
}

export default async function MatHangPage() {
  const rows = await db.select().from(items).orderBy(items.maHang);

  return (
    <main className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-xl font-bold text-slate-900 mb-4">
        Danh mục Mặt hàng
      </h1>

      <ItemForm />

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2">Mã hàng</th>
              <th className="text-left px-4 py-2">Tên hàng</th>
              <th className="text-left px-4 py-2">Đơn vị</th>
              <th className="text-right px-4 py-2">Giá bán</th>
              <th className="text-right px-4 py-2">Bao/pallet</th>
              <th className="text-left px-4 py-2">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((it) => {
              const baoPerPallet =
                it.soBaoLop && it.soLopPallet
                  ? it.soBaoLop * it.soLopPallet
                  : null;
              return (
                <tr key={it.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-mono">{it.maHang}</td>
                  <td className="px-4 py-2">{it.tenHang}</td>
                  <td className="px-4 py-2">{it.baseUnit}</td>
                  <td className="px-4 py-2 text-right">
                    {formatMoney(it.giaBan)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {baoPerPallet ?? "—"}
                  </td>
                  <td className="px-4 py-2">
                    {it.active ? "Hoạt động" : "Ngừng hoạt động"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
