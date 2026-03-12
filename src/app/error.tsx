"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[App Error]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-stone-200 p-8 text-center">
        <div className="text-5xl mb-4">😵</div>
        <h1 className="text-xl font-bold text-stone-800 mb-2">เกิดข้อผิดพลาด</h1>
        <p className="text-sm text-stone-500 mb-6">{error.message}</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 rounded-xl bg-orange-500 text-white text-sm font-medium hover:bg-orange-600"
          >
            ลองใหม่
          </button>
          <Link
            href="/"
            className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 text-sm font-medium hover:bg-stone-50"
          >
            กลับหน้าแรก
          </Link>
        </div>
      </div>
    </div>
  );
}
