"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/types";

const TAG_COLORS: Record<string, string> = {
  orange: "bg-orange-100 text-orange-700",
  red:    "bg-red-100 text-red-700",
  green:  "bg-green-100 text-green-700",
  blue:   "bg-blue-100 text-blue-700",
  purple: "bg-purple-100 text-purple-700",
  yellow: "bg-yellow-100 text-yellow-800",
};
import toast from "react-hot-toast";

interface Props {
  product: Product;
}

export default function ProductCard({ product }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const { addToCart, loading } = useCart();
  const { isWishlisted, toggle: toggleWishlist } = useWishlist();
  const [adding, setAdding] = useState(false);

  const hasVariants = product.variants && product.variants.length > 0;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    // If product has variants, user must select one on the detail page first
    if (hasVariants) {
      router.push(`/products/${product.id}`);
      return;
    }
    if (!user) {
      toast.error("กรุณาเข้าสู่ระบบก่อน");
      router.push("/login");
      return;
    }
    if (product.stock === 0) return;
    setAdding(true);
    try {
      await addToCart(product.id);
      toast.success("เพิ่มในตะกร้าแล้ว! 🛒");
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setAdding(false);
    }
  };

  const firstImage = product.images?.find((img) => {
    if (typeof img !== "string" || !img.trim()) return false;
    try { new URL(img); return true; } catch { return false; }
  });
  const image = firstImage || `https://placehold.co/400x300/fff7ed/f97316?text=${encodeURIComponent(product.name)}`;

  return (
    <Link href={`/products/${product.id}`}>
      <div className="card group hover:shadow-md transition-all duration-300 hover:-translate-y-1 cursor-pointer">
        {/* Image */}
        <div className="relative h-52 overflow-hidden bg-orange-50">
          <Image
            src={image}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          {/* Badges: featured + tags stacked top-left */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {product.featured && (
              <span className="badge bg-orange-500 text-white">⭐ แนะนำ</span>
            )}
            {product.tags?.slice(0, 2).map((tag) => (
              <span
                key={tag.id}
                className={`badge ${TAG_COLORS[tag.color] ?? TAG_COLORS.orange}`}
              >
                {tag.icon} {tag.name}
              </span>
            ))}
          </div>
          {/* Discount badge top-right */}
          {product.normalPrice != null && product.normalPrice > product.price && (
            <span className="absolute top-2 right-2 bg-red-500 text-white text-[11px] font-bold px-1.5 py-0.5 rounded-md leading-tight z-10">
              -{Math.round((1 - product.price / product.normalPrice) * 100)}%
            </span>
          )}
          {user && (
            <button
              onClick={(e) => { e.preventDefault(); toggleWishlist(product.id); }}
              className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
            >
              {isWishlisted(product.id) ? "❤️" : "🤍"}
            </button>
          )}
          {product.stock === 0 && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="bg-white text-stone-700 font-bold px-3 py-1 rounded-full text-sm">
                สินค้าหมด
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-orange-500 font-medium bg-orange-50 px-2 py-0.5 rounded-full">
              {product.category.icon} {product.category.name}
            </span>
            {product.petType && (
              <span className="text-xs text-stone-500 bg-stone-50 px-2 py-0.5 rounded-full">
                {product.petType.icon} {product.petType.name}
              </span>
            )}
          </div>
          <h3 className="font-semibold text-stone-800 mt-1 line-clamp-2 group-hover:text-orange-500 transition-colors">
            {product.name}
          </h3>
          {product.shortDescription && (
            <p className="text-sm text-stone-500 mt-1 line-clamp-3">
              {product.shortDescription}
            </p>
          )}

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-stone-50">
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-bold text-orange-500">{formatPrice(product.price)}</span>
                {product.normalPrice != null && product.normalPrice > product.price && (
                  <span className="text-xs text-stone-400 line-through">{formatPrice(product.normalPrice)}</span>
                )}
              </div>
              {product.stock > 0 && product.stock <= 5 && (
                <p className="text-xs text-red-500 mt-0.5">เหลือ {product.stock} ชิ้น</p>
              )}
            </div>
            <button
              onClick={handleAddToCart}
              disabled={product.stock === 0 || adding || loading}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                product.stock === 0
                  ? "bg-stone-100 text-stone-400 cursor-not-allowed"
                  : "bg-orange-500 hover:bg-orange-600 text-white active:scale-95"
              }`}
            >
              {adding ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : hasVariants ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              )}
              {hasVariants ? "เลือกตัวเลือก" : "ใส่ตะกร้า"}
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
