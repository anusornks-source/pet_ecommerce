"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, use } from "react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { formatPrice, PET_TYPE_LABEL } from "@/lib/utils";
import type { Product } from "@/types";
import toast from "react-hot-toast";

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { addToCart } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetch(`/api/products/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setProduct(data.data);
        setLoading(false);
      });
  }, [id]);

  const handleAddToCart = async () => {
    if (!user) {
      toast.error("กรุณาเข้าสู่ระบบก่อน");
      router.push("/login");
      return;
    }
    if (!product || product.stock === 0) return;
    setAdding(true);
    try {
      await addToCart(product.id, quantity);
      toast.success(`เพิ่ม "${product.name}" ในตะกร้าแล้ว! 🛒`);
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-pulse">
          <div className="h-96 bg-stone-100 rounded-3xl" />
          <div className="space-y-4">
            <div className="h-8 bg-stone-100 rounded w-3/4" />
            <div className="h-6 bg-stone-100 rounded w-1/4" />
            <div className="h-4 bg-stone-100 rounded" />
            <div className="h-4 bg-stone-100 rounded w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">😢</div>
        <h2 className="text-2xl font-bold text-stone-700">ไม่พบสินค้า</h2>
        <Link href="/products" className="mt-4 btn-primary inline-block">กลับไปดูสินค้า</Link>
      </div>
    );
  }

  const images = product.images?.length
    ? product.images
    : [`https://placehold.co/600x400/fff7ed/f97316?text=${encodeURIComponent(product.name)}`];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-stone-400 mb-6">
        <Link href="/" className="hover:text-orange-500">หน้าแรก</Link>
        <span>/</span>
        <Link href="/products" className="hover:text-orange-500">สินค้า</Link>
        <span>/</span>
        <Link href={`/products?category=${product.category.slug}`} className="hover:text-orange-500">
          {product.category.name}
        </Link>
        <span>/</span>
        <span className="text-stone-600 truncate max-w-48">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Images */}
        <div className="space-y-3">
          <div className="relative h-80 md:h-96 rounded-3xl overflow-hidden bg-orange-50">
            <Image
              src={images[selectedImage]}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            {product.featured && (
              <span className="absolute top-4 left-4 bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                ⭐ สินค้าแนะนำ
              </span>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`relative w-20 h-20 rounded-xl overflow-hidden shrink-0 border-2 transition-colors ${
                    selectedImage === idx ? "border-orange-500" : "border-stone-100"
                  }`}
                >
                  <Image src={img} alt="" fill className="object-cover" sizes="80px" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-orange-500 font-medium bg-orange-50 px-3 py-1 rounded-full">
                {product.category.icon} {product.category.name}
              </span>
              {product.petType && (
                <span className="text-sm text-stone-500 bg-stone-50 px-3 py-1 rounded-full">
                  {PET_TYPE_LABEL[product.petType] || product.petType}
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-stone-800">{product.name}</h1>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-orange-500">{formatPrice(product.price)}</span>
          </div>

          {/* Stock */}
          <div className="flex items-center gap-2">
            {product.stock > 0 ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
                <span className="text-sm text-green-600 font-medium">
                  มีสินค้า {product.stock <= 5 ? `(เหลือ ${product.stock} ชิ้น)` : ""}
                </span>
              </>
            ) : (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
                <span className="text-sm text-red-500 font-medium">สินค้าหมด</span>
              </>
            )}
          </div>

          {/* Description */}
          <div>
            <h3 className="font-semibold text-stone-800 mb-2">รายละเอียด</h3>
            <p className="text-stone-600 leading-relaxed">{product.description}</p>
          </div>

          {/* Quantity + Add to cart */}
          {product.stock > 0 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-stone-600 block mb-2">จำนวน</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 rounded-xl border border-stone-200 flex items-center justify-center text-stone-600 hover:bg-orange-50 hover:border-orange-300 transition-colors text-lg font-bold"
                  >
                    −
                  </button>
                  <span className="w-12 text-center font-bold text-stone-800 text-lg">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    className="w-10 h-10 rounded-xl border border-stone-200 flex items-center justify-center text-stone-600 hover:bg-orange-50 hover:border-orange-300 transition-colors text-lg font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleAddToCart}
                  disabled={adding}
                  className="flex-1 btn-primary py-4 text-base flex items-center justify-center gap-2"
                >
                  {adding ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    "🛒"
                  )}
                  เพิ่มในตะกร้า
                </button>
                <Link
                  href="/cart"
                  className="btn-outline py-4 px-6 flex items-center gap-2"
                  onClick={handleAddToCart}
                >
                  ซื้อเลย
                </Link>
              </div>
            </div>
          )}

          {/* Features */}
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-stone-100">
            {[
              { icon: "🚚", label: "จัดส่งทั่วไทย" },
              { icon: "✅", label: "สินค้าคุณภาพ" },
              { icon: "💬", label: "ดูแลหลังขาย" },
            ].map((f) => (
              <div key={f.label} className="text-center p-3 bg-orange-50 rounded-xl">
                <div className="text-xl mb-1">{f.icon}</div>
                <p className="text-xs text-stone-600">{f.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
