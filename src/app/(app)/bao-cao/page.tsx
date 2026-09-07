import Link from "next/link";

const REPORTS = [
  {
    href: "/bao-cao/ton-kho",
    title: "Báo cáo tồn kho",
    desc: "Tồn kho hiện tại theo công ty / kho / khu vực / vị trí / TTHH, tính trực tiếp từ sổ cái tồn kho.",
  },
  {
    href: "/bao-cao/cuoc-van-chuyen",
    title: "Báo cáo cước vận chuyển",
    desc: "Tổng hợp cước + phụ phí theo đơn vị vận tải (yêu cầu quyền xem cước).",
  },
];

export default function BaoCaoPage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-xl font-bold text-slate-900 mb-6">Báo cáo</h1>
      <div className="grid grid-cols-2 gap-4">
        {REPORTS.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            className="rounded-lg border border-slate-200 bg-white p-5 hover:border-orange-300"
          >
            <h2 className="font-semibold text-slate-900 mb-1">{r.title}</h2>
            <p className="text-sm text-slate-500">{r.desc}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
