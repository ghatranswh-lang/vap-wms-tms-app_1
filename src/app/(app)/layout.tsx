import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";

const NAV = [
  { href: "/", label: "Trang chủ" },
  { href: "/mua-hang", label: "Mua hàng" },
  { href: "/nhap-kho", label: "Nhập kho" },
  { href: "/chuyen-kho", label: "Chuyển kho" },
  { href: "/nhap-kho-duc-hoa", label: "Nhập kho Đức Hòa" },
  { href: "/ban-hang", label: "Bán hàng" },
  { href: "/xuat-kho", label: "Xuất kho" },
  { href: "/giai-chap", label: "Giải chấp" },
  { href: "/van-tai", label: "Vận tải" },
  { href: "/bao-cao", label: "Báo cáo" },
  { href: "/danh-muc/cong-ty", label: "Công ty" },
  { href: "/danh-muc/kho", label: "Kho" },
  { href: "/danh-muc/mat-hang", label: "Mặt hàng" },
  { href: "/danh-muc/nha-cung-cap", label: "Nhà cung cấp" },
  { href: "/danh-muc/don-vi-van-tai", label: "Đơn vị vận tải" },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Tài khoản Tài xế chỉ dùng Cổng tài xế riêng (giao diện tối giản trên
  // điện thoại) — không vào giao diện quản lý kho/vận tải đầy đủ này.
  if ((session?.user as unknown as { role?: string })?.role === "TAI_XE") {
    redirect("/tai-xe");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="font-bold text-slate-900">VAP WMS+TMS</span>
            <nav className="flex items-center gap-4 text-sm">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="text-slate-600 hover:text-orange-600"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span>{session?.user?.name}</span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button className="text-slate-500 hover:text-red-600 underline">
                Đăng xuất
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
