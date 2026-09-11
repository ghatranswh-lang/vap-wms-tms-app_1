"use client";

import { useActionState } from "react";
import { createUser, type UserFormState } from "./actions";

const ROLES: { value: string; label: string }[] = [
  { value: "ADMIN", label: "Admin" },
  { value: "QUAN_LY_KHO", label: "Quản lý kho" },
  { value: "NHAN_VIEN_KHO", label: "Nhân viên kho" },
  { value: "KE_TOAN", label: "Kế toán" },
  { value: "SALE", label: "Kinh doanh (Sale)" },
  { value: "DOI_TAC_3PL", label: "Đối tác 3PL" },
  { value: "TAI_XE", label: "Tài xế" },
];

export default function UserForm() {
  const initialState: UserFormState = {};
  const [state, formAction, pending] = useActionState(createUser, initialState);

  return (
    <form
      action={formAction}
      className="rounded-lg border border-slate-200 bg-white p-4 grid grid-cols-2 gap-3 mb-6"
    >
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Tên đăng nhập
        </label>
        <input
          name="username"
          required
          placeholder="VD: ketoan02"
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Mật khẩu
        </label>
        <input
          name="password"
          type="text"
          required
          placeholder="Ít nhất 6 ký tự"
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Họ tên
        </label>
        <input
          name="fullName"
          required
          placeholder="VD: Nguyễn Văn A"
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Vai trò
        </label>
        <select
          name="role"
          defaultValue="SALE"
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="xemGiaNhap" />
        Được xem giá nhập (đơn giá mua hàng)
      </label>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="xemCuoc" />
        Được xem báo cáo cước vận chuyển
      </label>
      <div className="col-span-2 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-orange-600 text-white px-4 py-1.5 text-sm font-semibold hover:bg-orange-700 disabled:opacity-60"
        >
          {pending ? "Đang lưu..." : "+ Thêm người dùng"}
        </button>
        {state?.error && (
          <span className="text-sm text-red-600">{state.error}</span>
        )}
      </div>
    </form>
  );
}
