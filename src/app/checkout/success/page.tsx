import { Suspense } from "react";
import OrderSuccessContent from "./OrderSuccessContent";

export default function OrderSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-lg mx-auto px-4 py-20 text-center">
          <div className="text-5xl animate-bounce mb-4">🎉</div>
          <p className="text-stone-500">กำลังโหลด...</p>
        </div>
      }
    >
      <OrderSuccessContent />
    </Suspense>
  );
}
