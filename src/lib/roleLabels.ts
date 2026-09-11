// Nhãn tiếng Việt hiển thị cho từng vai trò — dùng chung ở màn Quản lý người
// dùng (danh sách + trang phân quyền) để tránh khai báo lặp lại.
export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  QUAN_LY_KHO: "Quản lý kho",
  NHAN_VIEN_KHO: "Nhân viên kho",
  KE_TOAN: "Kế toán",
  SALE: "Kinh doanh (Sale)",
  DOI_TAC_3PL: "Đối tác 3PL",
  TAI_XE: "Tài xế",
};
