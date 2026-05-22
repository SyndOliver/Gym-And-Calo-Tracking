import Link from "next/link";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 space-y-4">
      <div className="text-6xl">🔍</div>
      <h1 className="text-2xl font-bold">Không tìm thấy</h1>
      <p className="text-sm text-muted">Trang bạn đang tìm không tồn tại hoặc đã bị xoá.</p>
      <Link href="/" className="btn btn-primary">
        <Home className="h-4 w-4" /> Về trang chủ
      </Link>
    </div>
  );
}
