"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useWishlist } from "@/context/WishlistContext";
import ProductCard from "@/components/ProductCard";
import type { WishlistItem } from "@/types";

export default function WishlistPage() {
  const { user } = useAuth();
  const { wishlistIds } = useWishlist();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    fetch("/api/wishlist")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setItems(data.data);
        setLoading(false);
      });
  }, [user, wishlistIds]);

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold text-stone-700 mb-2">กรุณาเข้าสู่ระบบ</h2>
        <Link href="/login" className="btn-primary px-8 py-3">เข้าสู่ระบบ</Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-stone-800">รายการโปรด</h1>
        <p className="text-stone-500 mt-1">
          {loading ? "กำลังโหลด..." : `${items.length} รายการ`}
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-52 bg-stone-100" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-stone-100 rounded w-1/2" />
                <div className="h-4 bg-stone-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🤍</div>
          <h3 className="text-xl font-semibold text-stone-600 mb-2">ยังไม่มีรายการโปรด</h3>
          <p className="text-stone-400 mb-6">กดหัวใจบนสินค้าที่คุณชอบเพื่อบันทึกไว้</p>
          <Link href="/products" className="btn-primary px-8 py-3">เลือกดูสินค้า</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {items.map((item) => (
            <ProductCard key={item.id} product={item.product} />
          ))}
        </div>
      )}
    </div>
  );
}
