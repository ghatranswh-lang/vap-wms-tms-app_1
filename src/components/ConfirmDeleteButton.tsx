"use client";

// Nút Xoá dùng chung — bọc 1 Server Action, hỏi xác nhận trước khi submit để
// tránh bấm nhầm xoá chứng từ (đặc biệt các chứng từ ảnh hưởng tồn kho).
export default function ConfirmDeleteButton({
  action,
  label = "Xoá",
  confirmText = "Bạn có chắc muốn xoá? Không thể hoàn tác.",
  className,
}: {
  action: () => Promise<void>;
  label?: string;
  confirmText?: string;
  className?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirmText)) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className={
          className ??
          "rounded-md border border-red-300 text-red-600 bg-white px-4 py-1.5 text-sm font-semibold hover:bg-red-50"
        }
      >
        {label}
      </button>
    </form>
  );
}
