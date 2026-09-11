// Seed dữ liệu khởi tạo cho môi trường dev/test.
// Chạy: npm run db:seed
import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "./index";
import {
  companies,
  warehouses,
  zones,
  locations,
  items,
  suppliers,
  customers,
  carriers,
  users,
} from "./schema";

async function main() {
  console.log("Seeding...");

  // ---- Companies ----
  const [vap, pla, dam, kh3pl01, kh3pl02] = await db
    .insert(companies)
    .values([
      { code: "VAP", name: "Công ty Việt An Pha (VAP)", isInternal: true, mst: "0300000001" },
      { code: "PLA", name: "Công ty PLA", isInternal: true, mst: "0300000002" },
      { code: "DAM", name: "Công ty DAM", isInternal: true, mst: "0300000003" },
      { code: "KH3PL01", name: "Khách thuê kho A", isInternal: false },
      { code: "KH3PL02", name: "Khách thuê kho B", isInternal: false },
    ])
    .returning();

  // ---- Warehouses ----
  const [khoCang, khoNoiDia, khoDucHoa, kho3pl] = await db
    .insert(warehouses)
    .values([
      { code: "KHO-CANG", name: "Kho Cảng", wms: true, baoVe: true, hienViTri: true },
      { code: "KHO-NOIDIA", name: "Kho Mua nội địa", wms: true, baoVe: false, hienViTri: true },
      { code: "KHO-DUCHOA", name: "Kho Đức Hòa", wms: true, baoVe: true, hienViTri: true },
      { code: "KHO-3PL-SOTRANS", name: "Kho 3PL - Sotrans", wms: false, baoVe: false, hienViTri: false },
    ])
    .returning();

  // ---- Zones (mỗi công ty nội bộ x mỗi kho WMS) ----
  const wmsWarehouses = [khoCang, khoNoiDia, khoDucHoa];
  const internalCompanies = [vap, pla, dam];
  const zoneRows = [];
  for (const wh of wmsWarehouses) {
    for (const co of internalCompanies) {
      zoneRows.push({
        warehouseId: wh.id,
        companyId: co.id,
        name: `${wh.name} - ${co.code}`,
      });
    }
  }
  const insertedZones = await db.insert(zones).values(zoneRows).returning();

  // ---- Locations (vài vị trí mẫu cho zone đầu tiên của mỗi kho) ----
  const firstZonePerWarehouse = wmsWarehouses.map(
    (wh) => insertedZones.find((z) => z.warehouseId === wh.id)!
  );
  const locationRows = firstZonePerWarehouse.flatMap((zone, idx) => [
    { zoneId: zone.id, name: `Dãy A${idx + 1} - Kệ 01`, maxPallets: 20, currentPallets: 0 },
    { zoneId: zone.id, name: `Dãy A${idx + 1} - Kệ 02`, maxPallets: 20, currentPallets: 0 },
  ]);
  await db.insert(locations).values(locationRows);

  // ---- Items ----
  await db.insert(items).values([
    {
      maHang: "HDPE5000S",
      tenHang: "Hạt nhựa nguyên sinh HDPE5000S",
      giaBan: "21000",
      trongLuongBao: "25",
      soBaoLop: 10,
      soLopPallet: 5,
      daiPallet: "1.2",
      rongPallet: "1",
      caoPallet: "1.4",
    },
    {
      maHang: "PP1100N",
      tenHang: "Hạt nhựa PP 1100N",
      giaBan: "19500",
      trongLuongBao: "25",
      soBaoLop: 10,
      soLopPallet: 5,
      daiPallet: "1.2",
      rongPallet: "1",
      caoPallet: "1.4",
    },
    {
      maHang: "LDPE2426H",
      tenHang: "Hạt nhựa LDPE 2426H",
      giaBan: "23500",
      trongLuongBao: "25",
      soBaoLop: 10,
      soLopPallet: 5,
      daiPallet: "1.2",
      rongPallet: "1",
      caoPallet: "1.4",
    },
  ]);

  // ---- Suppliers ----
  await db.insert(suppliers).values([
    { maNcc: "NCC001", name: "Công ty TNHH Hóa chất Miền Nam", mst: "0301111111" },
    { maNcc: "NCC002", name: "Công ty CP Nhựa Việt", mst: "0302222222" },
  ]);

  // ---- Customers ----
  await db.insert(customers).values([
    { maKh: "KH001", name: "Công ty TNHH Sản xuất Bao bì An Phát", mst: "0311111111" },
    { maKh: "KH002", name: "Công ty CP Nhựa Tiến Thành", mst: "0322222222" },
  ]);

  // ---- Carriers ----
  const [vtThanhCong, , xeNoiBoVap] = await db
    .insert(carriers)
    .values([
      { name: "Vận tải Thành Công", is3pl: true, khTuLay: false, xeNoiBo: false, xemCuoc: false },
      { name: "Vận tải Miền Nam", is3pl: true, khTuLay: false, xeNoiBo: false, xemCuoc: false },
      { name: "Xe nội bộ VAP", is3pl: false, khTuLay: false, xeNoiBo: true, xemCuoc: true },
    ])
    .returning();

  // ---- Users ----
  const passwordHash = await bcrypt.hash("admin123", 10);
  const taiXePasswordHash = await bcrypt.hash("taixe123", 10);
  await db.insert(users).values([
    { username: "admin", passwordHash, fullName: "Quản trị hệ thống", role: "ADMIN", xemCuoc: true, xemGiaNhap: true },
    { username: "kho.duchoa01", passwordHash, fullName: "NV Kho Đức Hòa", role: "NHAN_VIEN_KHO" },
    { username: "sale01", passwordHash, fullName: "NV Kinh doanh", role: "SALE" },
    { username: "ketoan01", passwordHash, fullName: "NV Kế toán", role: "KE_TOAN", xemGiaNhap: true },
    // Tài khoản Cổng tài xế mẫu — gắn với 1 carrier cụ thể (chỉ thấy đơn của carrier đó)
    {
      username: "taixe01",
      passwordHash: taiXePasswordHash,
      fullName: "Tài xế Thành Công",
      role: "TAI_XE",
      carrierId: vtThanhCong.id,
    },
    {
      username: "taixe.noibo",
      passwordHash: taiXePasswordHash,
      fullName: "Tài xế nội bộ VAP",
      role: "TAI_XE",
      carrierId: xeNoiBoVap.id,
    },
  ]);

  console.log("Seed done. Admin login: admin / admin123");
  console.log(
    `Companies: ${vap.code}, ${pla.code}, ${dam.code}, ${kh3pl01.code}, ${kh3pl02.code}`
  );
  console.log(`Warehouses: ${[khoCang, khoNoiDia, khoDucHoa, kho3pl].map((w) => w.code).join(", ")}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
