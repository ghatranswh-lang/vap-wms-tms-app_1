"use client";

import { useActionState } from "react";
import { createItem, type ItemFormState } from "./actions";

export default function ItemForm() {
  const initialState: ItemFormState = {};
  const [state, formAction, pending] = useActionState(createItem, initialState);

  return (
    <form
      action={formAction}
      className="rounded-lg border border-slate-200 bg-white p-4 grid grid-cols-3 gap-3 mb-6"
    >
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Mã hàng
        </label>
        <input
          name="maHang"
          required
          placeholder="VD: HDPE6000S"
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div className="col-span-2">
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Tên hàng
        </label>
        <input
          name="tenHang"
          required
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Đơn vị tính
        </label>
        <input
          name="baseUnit"
          defaultValue="KG"
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Giá bán
        </label>
        <input
          name="giaBan"
          type="number"
          min={0}
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Trọng lượng/bao (KG)
        </label>
        <input
          name="trongLuongBao"
          type="number"
          min={0}
          step="0.001"
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Số bao/lớp
        </label>
        <input
          name="soBaoLop"
          type="number"
          min={0}
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Số lớp/pallet
        </label>
        <input
          name="soLopPallet"
          type="number"
          min={0}
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Dài pallet (m)
        </label>
        <input
          name="daiPallet"
          type="number"
          min={0}
          step="0.01"
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Rộng pallet (m)
        </label>
        <input
          name="rongPallet"
          type="number"
          min={0}
          step="0.01"
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Cao pallet (m)
        </label>
        <input
          name="caoPallet"
          type="number"
          min={0}
          step="0.01"
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div className="col-span-3 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-orange-600 text-white px-4 py-1.5 text-sm font-semibold hover:bg-orange-700 disabled:opacity-60"
        >
          {pending ? "Đang lưu..." : "+ Thêm mặt hàng"}
        </button>
        {state?.error && (
          <span className="text-sm text-red-600">{state.error}</span>
        )}
      </div>
    </form>
  );
}
