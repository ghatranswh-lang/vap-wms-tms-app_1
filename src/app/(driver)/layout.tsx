import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";

export default async function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const role = (session?.user as unknown as { role?: string })?.role;

  // Chỉ tài khoản Tài xế mới vào Cổng tài xế; các role khác quay lại app chính.
  if (role !== "TAI_XE") {
    redirect("/");
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-bold text-slate-900">Cổng Tài xế</span>
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
      <div className="flex-1 max-w-xl mx-auto w-full">{children}</div>
    </div>
  );
}
