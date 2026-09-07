import LoginForm from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl || "/";

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#faf9f5] px-4">
      <div className="mb-8 text-center">
        <div className="text-2xl font-bold text-slate-900">
          VIỆT AN PHA · WMS+TMS
        </div>
        <div className="text-sm text-slate-500 mt-1">
          Đăng nhập để tiếp tục
        </div>
      </div>
      <LoginForm callbackUrl={callbackUrl} />
    </main>
  );
}
