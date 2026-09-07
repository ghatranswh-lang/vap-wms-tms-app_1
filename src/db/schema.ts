// Drizzle ORM schema — VAP WMS+TMS (Việt An Pha)
//
// Ghi chú thiết kế (đọc trước khi sửa):
// - Company: dùng chung 1 bảng cho cả pháp nhân nội bộ (VAP/PLA/DAM, isInternal=true)
//   lẫn khách thuê kho 3PL (isInternal=false). Hai nhóm này KHÔNG BAO GIỜ được gộp
//   tồn kho với nhau — luôn lọc theo isInternal khi tính báo cáo tồn kho.
// - Zone (khu_vuc) có companyId bắt buộc trỏ tới 1 company isInternal=true — kho 3PL
//   (wms=false) không có zone/location nào cả.
// - TTHH (tình trạng hàng hoá) chỉ có 3 giá trị: HTC (thế chấp), KTC (không thế chấp),
//   DGC (đã giải chấp). Hoàn tất Giải chấp LUÔN chuyển hàng thành DGC, bất kể kho nào
//   (quyết định nghiệp vụ đã chốt với khách hàng — không phải KTC riêng cho Kho Cảng).
// - Xe/tài xế: KHÔNG làm danh mục cố định — chỉ lưu dạng text tự do trên từng chứng từ
//   (đúng theo mockup gốc, phù hợp xe 3PL thuê ngoài xoay vòng).
// - Tồn kho không lưu số dư trực tiếp: mọi thay đổi tồn kho đi qua bảng stockLedger
//   (sổ cái kiểu bút toán, append-only); số dư tồn (StockBalance) là kết quả SUM(deltaQty)
//   group theo (companyId, warehouseId, zoneId, locationId, maHangId, tthh, lot) — xem
//   src/lib/stock.ts để tính.
// - Phạm vi v1: tập trung vào luồng nghiệp vụ lõi (PO → Nhập kho → Chuyển kho → Nhập kho
//   Đức Hòa → Giải chấp → Xuất kho → Vận tải) + Danh mục + User/Role. Các bảng cấu hình
//   nâng cao (trường mở rộng tuỳ biến, cấu hình cột báo cáo, phân quyền xem cước theo field)
//   sẽ bổ sung ở phase sau, chưa cần thiết cho một hệ thống vận hành được ngay.

import {
  pgTable,
  serial,
  text,
  varchar,
  boolean,
  integer,
  numeric,
  timestamp,
  date,
  pgEnum,
  primaryKey,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---------- Enums ----------
export const tthhEnum = pgEnum("tthh", ["HTC", "KTC", "DGC"]);
export const roleEnum = pgEnum("role", [
  "ADMIN",
  "QUAN_LY_KHO",
  "NHAN_VIEN_KHO",
  "DOI_TAC_3PL",
  "KE_TOAN",
  "SALE",
  "TAI_XE",
]);
export const transferStatusEnum = pgEnum("transfer_status", [
  "DANG_CHUYEN",
  "HOAN_TAT",
]);
export const giaiChapStatusEnum = pgEnum("giai_chap_status", [
  "NHAP",
  "HOAN_TAT",
]);
export const giaiChapSourceEnum = pgEnum("giai_chap_source", [
  "MANUAL",
  "XUATKHO_INLINE",
]);
export const receiptSourceEnum = pgEnum("receipt_source", ["PO", "TRANSFER"]);
export const dispatchLoaiDonEnum = pgEnum("dispatch_loai_don", [
  "NHAP_HANG",
  "LAY_HANG",
  "KHAC",
]);
export const dispatchStatusEnum = pgEnum("dispatch_status", [
  "CHO_DANG_KY",
  "CHO_VAO_KHO",
  "CHO_LAY_GIAO_HANG",
  "HOAN_THANH",
]);
export const stockRefTypeEnum = pgEnum("stock_ref_type", [
  "PO_RECEIPT",
  "TRANSFER_OUT",
  "TRANSFER_IN",
  "GOODS_ISSUE",
  "COLLATERAL_RELEASE",
  "ADJUSTMENT",
]);

// ---------- Danh mục / Master data ----------

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  name: text("name").notNull(),
  // true = pháp nhân nội bộ Việt An Pha (VAP/PLA/DAM); false = khách thuê kho 3PL.
  // Hai nhóm không bao giờ gộp tồn kho — enforce ở tầng query, không ở DB constraint.
  isInternal: boolean("is_internal").notNull().default(true),
  mst: text("mst"),
  diaChi: text("dia_chi"),
  active: boolean("active").notNull().default(true),
  hasTransactions: boolean("has_transactions").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 64 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  role: roleEnum("role").notNull(),
  // Quyền xem cước vận chuyển (field-level ACL riêng cho các báo cáo cước)
  xemCuoc: boolean("xem_cuoc").notNull().default(false),
  // Nếu tài khoản là đối tác 3PL, gắn với 1 carrier cụ thể để chỉ thấy đơn của mình
  carrierId: integer("carrier_id"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Với user role Sale/Đối tác 3PL quản lý nhiều carrier cùng lúc (threePlScopes)
export const userCarrierScopes = pgTable(
  "user_carrier_scopes",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    carrierId: integer("carrier_id")
      .notNull()
      .references(() => carriers.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.carrierId] })]
);

export const warehouses = pgTable("warehouses", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  name: text("name").notNull(),
  // Có quản lý Khu vực/Vị trí hay không (Kho Cảng/Mua nội địa/Đức Hòa = true, 3PL = false)
  wms: boolean("wms").notNull().default(false),
  // Có bảo vệ/cổng gác (thêm bước "Chờ vào kho" trong luồng vận tải)
  baoVe: boolean("bao_ve").notNull().default(false),
  hienViTri: boolean("hien_vi_tri").notNull().default(true),
  diaChi: text("dia_chi"),
  sdt: text("sdt"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const zones = pgTable("zones", {
  id: serial("id").primaryKey(),
  warehouseId: integer("warehouse_id")
    .notNull()
    .references(() => warehouses.id, { onDelete: "restrict" }),
  // Luôn trỏ tới 1 company isInternal=true (kho 3PL không có zone)
  companyId: integer("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  active: boolean("active").notNull().default(true),
  hasTransactions: boolean("has_transactions").notNull().default(false),
});

export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  zoneId: integer("zone_id")
    .notNull()
    .references(() => zones.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  maxPallets: integer("max_pallets"),
  // currentPallets được duy trì bằng trigger/ứng dụng khi ghi stockLedger; xem src/lib/stock.ts
  currentPallets: integer("current_pallets").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const items = pgTable("items", {
  id: serial("id").primaryKey(),
  maHang: varchar("ma_hang", { length: 64 }).notNull().unique(),
  tenHang: text("ten_hang").notNull(),
  baseUnit: varchar("base_unit", { length: 16 }).notNull().default("KG"),
  giaBan: numeric("gia_ban", { precision: 18, scale: 2 }),
  trongLuongBao: numeric("trong_luong_bao", { precision: 12, scale: 3 }),
  soBaoLop: integer("so_bao_lop"),
  soLopPallet: integer("so_lop_pallet"),
  daiPallet: numeric("dai_pallet", { precision: 10, scale: 2 }),
  rongPallet: numeric("rong_pallet", { precision: 10, scale: 2 }),
  caoPallet: numeric("cao_pallet", { precision: 10, scale: 2 }),
  active: boolean("active").notNull().default(true),
  hasTransactions: boolean("has_transactions").notNull().default(false),
  custom: jsonb("custom").notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  maNcc: varchar("ma_ncc", { length: 32 }).notNull().unique(),
  name: text("name").notNull(),
  mst: text("mst"),
  diaChi: text("dia_chi"),
  active: boolean("active").notNull().default(true),
  hasTransactions: boolean("has_transactions").notNull().default(false),
});

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  maKh: varchar("ma_kh", { length: 32 }).notNull().unique(),
  maGiaoHang: varchar("ma_giao_hang", { length: 32 }),
  name: text("name").notNull(),
  mst: text("mst"),
  diaChiThue: text("dia_chi_thue"),
  saleRepUserId: integer("sale_rep_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  active: boolean("active").notNull().default(true),
  hasTransactions: boolean("has_transactions").notNull().default(false),
});

export const deliveryPoints = pgTable("delivery_points", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  name: text("name"),
  diaChiGiaoHang: text("dia_chi_giao_hang").notNull(),
});

export const carriers = pgTable("carriers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  userId: integer("user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  khTuLay: boolean("kh_tu_lay").notNull().default(false),
  xeNoiBo: boolean("xe_noi_bo").notNull().default(false),
  is3pl: boolean("is_3pl").notNull().default(true),
  xemCuoc: boolean("xem_cuoc").notNull().default(false),
  active: boolean("active").notNull().default(true),
  hasTransactions: boolean("has_transactions").notNull().default(false),
});

// ---------- Mua hàng (PO) ----------

export const purchaseOrders = pgTable("purchase_orders", {
  id: serial("id").primaryKey(),
  poNumber: varchar("po_number", { length: 32 }).notNull().unique(),
  createdDate: date("created_date").notNull(),
  companyId: integer("company_id")
    .notNull()
    .references(() => companies.id),
  supplierId: integer("supplier_id")
    .notNull()
    .references(() => suppliers.id),
  // Cho phép chọn khu vực đích ngay từ PO (tránh phải Chuyển kho nội bộ thêm 1 bước)
  zoneId: integer("zone_id").references(() => zones.id),
  currency: varchar("currency", { length: 8 }).notNull().default("VND"),
  ghiChu: text("ghi_chu"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const purchaseOrderLines = pgTable("purchase_order_lines", {
  id: serial("id").primaryKey(),
  poId: integer("po_id")
    .notNull()
    .references(() => purchaseOrders.id, { onDelete: "cascade" }),
  itemId: integer("item_id")
    .notNull()
    .references(() => items.id),
  donGia: numeric("don_gia", { precision: 18, scale: 2 }).notNull(),
  qty: numeric("qty", { precision: 14, scale: 3 }).notNull(),
  vatRate: numeric("vat_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  tthh: tthhEnum("tthh").notNull().default("KTC"),
  // Số lượng chưa nhập — duy trì bằng ứng dụng mỗi khi có goods_receipt_lines mới
  slChuaNhap: numeric("sl_chua_nhap", { precision: 14, scale: 3 }).notNull(),
});

// ---------- Nhập kho (từ PO hoặc từ Chuyển kho) ----------

export const goodsReceipts = pgTable("goods_receipts", {
  id: serial("id").primaryKey(),
  grnNumber: varchar("grn_number", { length: 32 }).notNull().unique(),
  sourceType: receiptSourceEnum("source_type").notNull(),
  poId: integer("po_id").references(() => purchaseOrders.id),
  transferOrderId: integer("transfer_order_id").references(
    () => transferOrders.id
  ),
  warehouseId: integer("warehouse_id")
    .notNull()
    .references(() => warehouses.id),
  ngayNhap: date("ngay_nhap").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const goodsReceiptLines = pgTable("goods_receipt_lines", {
  id: serial("id").primaryKey(),
  receiptId: integer("receipt_id")
    .notNull()
    .references(() => goodsReceipts.id, { onDelete: "cascade" }),
  itemId: integer("item_id")
    .notNull()
    .references(() => items.id),
  soLuong: numeric("so_luong", { precision: 14, scale: 3 }).notNull(),
  zoneId: integer("zone_id").references(() => zones.id),
  locationId: integer("location_id").references(() => locations.id),
  tthh: tthhEnum("tthh").notNull().default("KTC"),
  lot: varchar("lot", { length: 32 }),
});

// ---------- Chuyển kho ----------

export const transferOrders = pgTable("transfer_orders", {
  id: serial("id").primaryKey(),
  ckNumber: varchar("ck_number", { length: 32 }).notNull().unique(),
  warehouseFromId: integer("warehouse_from_id")
    .notNull()
    .references(() => warehouses.id),
  warehouseToId: integer("warehouse_to_id")
    .notNull()
    .references(() => warehouses.id),
  // Xe/tài xế lưu dạng text tự do (quyết định: không làm danh mục cố định)
  donViVanTai: text("don_vi_van_tai"),
  soXe: varchar("so_xe", { length: 16 }),
  tenTaiXe: text("ten_tai_xe"),
  soCccd: varchar("so_cccd", { length: 16 }),
  cuocPhi: numeric("cuoc_phi", { precision: 18, scale: 2 }),
  status: transferStatusEnum("status").notNull().default("DANG_CHUYEN"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const transferOrderLines = pgTable("transfer_order_lines", {
  id: serial("id").primaryKey(),
  transferOrderId: integer("transfer_order_id")
    .notNull()
    .references(() => transferOrders.id, { onDelete: "cascade" }),
  itemId: integer("item_id")
    .notNull()
    .references(() => items.id),
  soLuong: numeric("so_luong", { precision: 14, scale: 3 }).notNull(),
  tthh: tthhEnum("tthh").notNull().default("KTC"),
  lot: varchar("lot", { length: 32 }),
  // Khu vực/Vị trí NGUỒN — bắt buộc nếu kho đi có wms=true. Trừ tồn kho ngay
  // khi tạo phiếu chuyển kho (hàng coi như đã xuất khỏi vị trí này).
  zoneFromId: integer("zone_from_id").references(() => zones.id),
  locationFromId: integer("location_from_id").references(() => locations.id),
  // Khu vực/Vị trí ĐÍCH DỰ KIẾN — bắt buộc nếu kho đến có wms=true. Với đích
  // là Kho Đức Hòa, đây chỉ là vị trí DỰ KIẾN: tồn kho đích chỉ thật sự được
  // cộng khi có phiếu Nhập kho Đức Hòa xác nhận (có thể lệch vị trí thật nếu
  // vị trí dự kiến đã đầy — xử lý tại NhapKhoDucHoa). Với đích khác Đức Hòa,
  // tồn kho đích được cộng ngay tại đây, dùng đúng zoneToId/locationToId này.
  zoneToId: integer("zone_to_id").references(() => zones.id),
  locationToId: integer("location_to_id").references(() => locations.id),
});

// ---------- Bán hàng (SO) ----------

export const salesOrders = pgTable("sales_orders", {
  id: serial("id").primaryKey(),
  soNumber: varchar("so_number", { length: 32 }).notNull().unique(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customers.id),
  companyId: integer("company_id")
    .notNull()
    .references(() => companies.id),
  ghiChu: text("ghi_chu"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const salesOrderLines = pgTable("sales_order_lines", {
  id: serial("id").primaryKey(),
  soId: integer("so_id")
    .notNull()
    .references(() => salesOrders.id, { onDelete: "cascade" }),
  ngayGiaoDuKien: date("ngay_giao_du_kien").notNull(),
  itemId: integer("item_id")
    .notNull()
    .references(() => items.id),
  lot: varchar("lot", { length: 32 }),
  donGia: numeric("don_gia", { precision: 18, scale: 2 }).notNull(),
  soLuongDat: numeric("so_luong_dat", { precision: 14, scale: 3 }).notNull(),
  // Chỉ mang tính tham khảo — kho/khu vực/vị trí thật chốt ở bước Xuất kho
  khoXuatDuKienId: integer("kho_xuat_du_kien_id").references(
    () => warehouses.id
  ),
  // Số lượng đã xuất — duy trì bằng ứng dụng mỗi khi có goods_issue_lines mới
  slDaXuat: numeric("sl_da_xuat", { precision: 14, scale: 3 })
    .notNull()
    .default("0"),
});

// ---------- Xuất kho (PXK) ----------

export const goodsIssues = pgTable("goods_issues", {
  id: serial("id").primaryKey(),
  pxkNumber: varchar("pxk_number", { length: 32 }).notNull().unique(),
  ngayXuat: date("ngay_xuat").notNull(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customers.id),
  donViVanTai: text("don_vi_van_tai"),
  soXe: varchar("so_xe", { length: 16 }),
  tenTaiXe: text("ten_tai_xe"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 1 PXK có thể gộp nhiều SO (cùng 1 khách hàng)
export const goodsIssueSoLinks = pgTable(
  "goods_issue_so_links",
  {
    goodsIssueId: integer("goods_issue_id")
      .notNull()
      .references(() => goodsIssues.id, { onDelete: "cascade" }),
    salesOrderId: integer("sales_order_id")
      .notNull()
      .references(() => salesOrders.id, { onDelete: "restrict" }),
  },
  (t) => [primaryKey({ columns: [t.goodsIssueId, t.salesOrderId] })]
);

export const goodsIssueLines = pgTable("goods_issue_lines", {
  id: serial("id").primaryKey(),
  goodsIssueId: integer("goods_issue_id")
    .notNull()
    .references(() => goodsIssues.id, { onDelete: "cascade" }),
  soLineId: integer("so_line_id").references(() => salesOrderLines.id),
  itemId: integer("item_id")
    .notNull()
    .references(() => items.id),
  soLuong: numeric("so_luong", { precision: 14, scale: 3 }).notNull(),
  lot: varchar("lot", { length: 32 }),
  tthh: tthhEnum("tthh").notNull(),
  warehouseId: integer("warehouse_id")
    .notNull()
    .references(() => warehouses.id),
  zoneId: integer("zone_id").references(() => zones.id),
  locationId: integer("location_id").references(() => locations.id),
});

// ---------- Giải chấp (HSGC) ----------

export const collateralReleases = pgTable("collateral_releases", {
  id: serial("id").primaryKey(),
  hsgc: varchar("hsgc", { length: 32 }).notNull().unique(),
  ngay: date("ngay").notNull(),
  companyId: integer("company_id")
    .notNull()
    .references(() => companies.id),
  warehouseId: integer("warehouse_id")
    .notNull()
    .references(() => warehouses.id),
  zoneId: integer("zone_id").references(() => zones.id),
  locationId: integer("location_id").references(() => locations.id),
  itemId: integer("item_id")
    .notNull()
    .references(() => items.id),
  // Đơn vị Tấn (khác mặc định KG của toàn hệ thống)
  soLuongTan: numeric("so_luong_tan", { precision: 14, scale: 3 }).notNull(),
  boCt: text("bo_ct"),
  trangThai: giaiChapStatusEnum("trang_thai").notNull().default("NHAP"),
  source: giaiChapSourceEnum("source").notNull().default("MANUAL"),
  sourceGoodsIssueLineId: integer("source_goods_issue_line_id").references(
    () => goodsIssueLines.id
  ),
  ghiChu: text("ghi_chu"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- Vận tải ----------

export const dispatchOrders = pgTable("dispatch_orders", {
  id: serial("id").primaryKey(),
  vtNumber: varchar("vt_number", { length: 32 }).notNull().unique(),
  loaiDon: dispatchLoaiDonEnum("loai_don").notNull(),
  sourceTransferOrderId: integer("source_transfer_order_id").references(
    () => transferOrders.id
  ),
  sourceGoodsIssueId: integer("source_goods_issue_id").references(
    () => goodsIssues.id
  ),
  diaDiemText: text("dia_diem_text"),
  status: dispatchStatusEnum("status").notNull().default("CHO_DANG_KY"),
  carrierId: integer("carrier_id").references(() => carriers.id),
  cuocVanChuyen: numeric("cuoc_van_chuyen", { precision: 18, scale: 2 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 1 đơn vận tải có thể chia nhiều xe (mỗi xe chở 1 phần số lượng)
export const dispatchVehicleAssignments = pgTable(
  "dispatch_vehicle_assignments",
  {
    id: serial("id").primaryKey(),
    dispatchOrderId: integer("dispatch_order_id")
      .notNull()
      .references(() => dispatchOrders.id, { onDelete: "cascade" }),
    soXe: varchar("so_xe", { length: 16 }).notNull(),
    tenTaiXe: text("ten_tai_xe").notNull(),
    soCccd: varchar("so_cccd", { length: 16 }),
    qty: numeric("qty", { precision: 14, scale: 3 }),
    daXacNhan: boolean("da_xac_nhan").notNull().default(false),
    anhGiaoHangUrl: text("anh_giao_hang_url"),
  }
);

export const freightSurcharges = pgTable("freight_surcharges", {
  id: serial("id").primaryKey(),
  dispatchOrderId: integer("dispatch_order_id")
    .notNull()
    .references(() => dispatchOrders.id, { onDelete: "cascade" }),
  ten: text("ten").notNull(),
  soTien: numeric("so_tien", { precision: 18, scale: 2 }).notNull(),
});

// ---------- Sổ cái tồn kho (nguồn sự thật duy nhất cho số dư tồn) ----------

export const stockLedger = pgTable("stock_ledger", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id")
    .notNull()
    .references(() => companies.id),
  warehouseId: integer("warehouse_id")
    .notNull()
    .references(() => warehouses.id),
  zoneId: integer("zone_id").references(() => zones.id),
  locationId: integer("location_id").references(() => locations.id),
  itemId: integer("item_id")
    .notNull()
    .references(() => items.id),
  tthh: tthhEnum("tthh").notNull(),
  lot: varchar("lot", { length: 32 }),
  // Đơn vị KG luôn (kể cả bút toán phát sinh từ Giải chấp phải quy đổi Tấn->KG trước khi ghi)
  deltaQty: numeric("delta_qty", { precision: 16, scale: 3 }).notNull(),
  refType: stockRefTypeEnum("ref_type").notNull(),
  refId: integer("ref_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- Relations (để dùng query API kiểu quan hệ của Drizzle) ----------

export const companiesRelations = relations(companies, ({ many }) => ({
  zones: many(zones),
}));

export const warehousesRelations = relations(warehouses, ({ many }) => ({
  zones: many(zones),
}));

export const zonesRelations = relations(zones, ({ one, many }) => ({
  warehouse: one(warehouses, {
    fields: [zones.warehouseId],
    references: [warehouses.id],
  }),
  company: one(companies, {
    fields: [zones.companyId],
    references: [companies.id],
  }),
  locations: many(locations),
}));

export const locationsRelations = relations(locations, ({ one }) => ({
  zone: one(zones, { fields: [locations.zoneId], references: [zones.id] }),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  deliveryPoints: many(deliveryPoints),
}));

export const purchaseOrdersRelations = relations(
  purchaseOrders,
  ({ many }) => ({
    lines: many(purchaseOrderLines),
  })
);

export const purchaseOrderLinesRelations = relations(
  purchaseOrderLines,
  ({ one }) => ({
    po: one(purchaseOrders, {
      fields: [purchaseOrderLines.poId],
      references: [purchaseOrders.id],
    }),
    item: one(items, {
      fields: [purchaseOrderLines.itemId],
      references: [items.id],
    }),
  })
);

export const transferOrdersRelations = relations(
  transferOrders,
  ({ many }) => ({
    lines: many(transferOrderLines),
  })
);

export const salesOrdersRelations = relations(salesOrders, ({ many }) => ({
  lines: many(salesOrderLines),
}));

export const goodsIssuesRelations = relations(goodsIssues, ({ many }) => ({
  lines: many(goodsIssueLines),
  soLinks: many(goodsIssueSoLinks),
}));

export const dispatchOrdersRelations = relations(
  dispatchOrders,
  ({ many }) => ({
    vehicles: many(dispatchVehicleAssignments),
    surcharges: many(freightSurcharges),
  })
);
