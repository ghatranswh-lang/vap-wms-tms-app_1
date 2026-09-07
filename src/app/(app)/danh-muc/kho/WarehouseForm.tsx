"use client";

import { useActionState } from "react";
import { createWarehouse, type WarehouseFormState } from "./actions";

export default function WarehouseForm() {
  const initialState: WarehouseFormState = {};
  const [state, formAction, pending] = useActionState(
    createWarehouse,
    initialState
  );

  return (
    <form
      action={formAction}
      className="rounded-lg border border-slate-200 bg-white p-4 grid grid-cols-2 gap-3 mb-6"
    >
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Mã kho
        </label>
        <input
          name="code"
          required
          placeholder="VD: KHO-VUNGTAU"
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Tên kho
        </label>
        <input
          name="name"
          required
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Địa chỉ
        </label>
        <input
          name="diaChi"
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Số điện thoại
        </label>
        <input
          name="sdt"
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="wms" defaultChecked />
        Quản lý Khu vực/Vị trí (WMS)
      </label>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="baoVe" />
        Có Bảo vệ/Cổng gác (thêm bước &quot;Chờ vào kho&quot; khi xe tới)
      </label>
      <label className="flex items-center gap-2 text-sm text-slate-700 col-span-2">
        <input type="checkbox" name="hienViTri" defaultChecked />
        Hiện chọn Vị trí cụ thể khi nhập/chuyển kho (bỏ tick nếu chỉ cần quản lý
        tới cấp Khu vực)
      </label>
      <div className="col-span-2 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-orange-600 text-white px-4 py-1.5 text-sm font-semibold hover:bg-orange-700 disabled:opacity-60"
        >
          {pending ? "Đang lưu..." : "+ Thêm kho mới"}
        </button>
        {state?.error && (
          <span className="text-sm text-red-600">{state.error}</span>
        )}
      </div>
    </form>
  );
}
