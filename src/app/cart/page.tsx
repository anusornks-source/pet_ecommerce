"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/utils";
import toast from "react-hot-toast";

interface ShippingInfo {
  shipping: number;
  subtotal: number;
  freeShippingMin: number | null;
  addForFreeShipping: number | null;
}

export default function CartPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { cart, cartCount, loading, updateQuantity, removeItem } = useCart();
  const [shippingInfo, setShippingInfo] = useState<ShippingInfo | null>(null);

  useEffect(() => {
    if (cart?.items && cart.items.length > 0) {
      fetch("/api/cart/shipping")
        .then((r) => r.json())
        .then((d) => d.success && setShippingInfo(d.data));
    } else {
      setShippingInfo(null);
    }
  }, [cart]);

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold text-stone-700 mb-2">กรุณาเข้าสู่ระบบ</h2>
        <p className="text-stone-500 mb-6">เพื่อดูตะกร้าสินค้าของคุณ</p>
        <Link href="/login" className="btn-primary px-8 py-3">เข้าสู่ระบบ</Link>
      </div>
    );
  }

  const items = cart?.items || [];
  const itemPrice = (item: typeof items[0]) => item.variant?.price ?? item.product.price;
  const subtotal = shippingInfo?.subtotal ?? items.reduce((sum, item) => sum + itemPrice(item) * item.quantity, 0);
  const shipping = shippingInfo?.shipping ?? 0;
  const total = subtotal + shipping;

  const handleRemove = async (itemId: string, name: string) => {
    await removeItem(itemId);
    toast.success(`ลบ "${name}" ออกจากตะกร้าแล้ว`);
  };

  const handleQuantity = async (itemId: string, qty: number) => {
    if (qty < 1) return;
    await updateQuantity(itemId, qty);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-stone-800 mb-6">
        ตะกร้าสินค้า
        {cartCount > 0 && (
          <span className="ml-3 text-lg font-normal text-stone-400">({cartCount} รายการ)</span>
        )}
      </h1>

      {items.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-7xl mb-4">🛒</div>
          <h3 className="text-xl font-semibold text-stone-600 mb-2">ตะกร้าของคุณว่างเปล่า</h3>
          <p className="text-stone-400 mb-6">เพิ่มสินค้าที่คุณชอบลงในตะกร้าได้เลย</p>
          <Link href="/products" className="btn-primary px-8 py-3">เลือกซื้อสินค้า</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => {
              const img = item.variant?.variantImage ?? item.product.images?.[0] ?? `https://placehold.co/200x200/fff7ed/f97316?text=${encodeURIComponent(item.product.name)}`;
              const unitPrice = itemPrice(item);
              return (
                <div key={item.id} className="card p-4 flex gap-4">
                  <div className="relative w-24 h-24 rounded-xl overflow-hidden shrink-0 bg-orange-50">
                    <Image src={img} alt={item.product.name} fill className="object-cover" sizes="96px" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/products/${item.productId}`}
                      className="font-semibold text-stone-800 hover:text-orange-500 transition-colors line-clamp-2"
                    >
                      {item.product.name}
                    </Link>
                    <p className="text-sm text-stone-400 mt-0.5">
                      {item.product.category.icon} {item.product.category.name}
                    </p>
                    {item.variant && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {item.variant.size && (
                          <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full font-medium">
                            ขนาด: {item.variant.size}
                          </span>
                        )}
                        {item.variant.color && (
                          <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full font-medium">
                            สี: {item.variant.color}
                          </span>
                        )}
                        {item.variant.attributes?.map((attr, i) => (
                          <span key={i} className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full font-medium">
                            {attr.name}: {attr.value}
                          </span>
                        ))}
                        {item.variant.sku && (
                          <span className="text-xs text-stone-400 px-1">SKU: {item.variant.sku}</span>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-stone-400 mt-1">
                      {formatPrice(unitPrice)} / ชิ้น
                    </p>
                    <div className="flex items-center justify-between mt-3">
                      {/* Quantity control */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleQuantity(item.id, item.quantity - 1)}
                          disabled={loading || item.quantity <= 1}
                          className="w-8 h-8 rounded-lg border border-stone-200 flex items-center justify-center text-stone-600 hover:bg-orange-50 disabled:opacity-40 transition-colors"
                        >
                          −
                        </button>
                        <span className="w-8 text-center font-semibold text-stone-800">{item.quantity}</span>
                        <button
                          onClick={() => handleQuantity(item.id, item.quantity + 1)}
                          disabled={loading || item.quantity >= (item.variant?.stock ?? item.product.stock)}
                          className="w-8 h-8 rounded-lg border border-stone-200 flex items-center justify-center text-stone-600 hover:bg-orange-50 disabled:opacity-40 transition-colors"
                        >
                          +
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-orange-500">
                          {formatPrice(unitPrice * item.quantity)}
                        </span>
                        <button
                          onClick={() => handleRemove(item.id, item.product.name)}
                          className="text-stone-300 hover:text-red-400 transition-colors"
                          disabled={loading}
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="card p-6 sticky top-20">
              <h3 className="font-bold text-stone-800 text-lg mb-5">สรุปคำสั่งซื้อ</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-stone-600">
                  <span>ราคาสินค้า ({cartCount} รายการ)</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>ค่าจัดส่ง</span>
                  {shipping === 0 ? (
                    <span className="text-green-500 font-medium">ฟรี 🎉</span>
                  ) : (
                    <span>{formatPrice(shipping)}</span>
                  )}
                </div>
                {shippingInfo?.addForFreeShipping != null && shippingInfo.addForFreeShipping > 0 && (
                  <p className="text-xs text-stone-400">
                    ซื้อเพิ่มอีก {formatPrice(shippingInfo.addForFreeShipping)} เพื่อรับส่งฟรี
                  </p>
                )}
                <div className="pt-3 border-t border-stone-100 flex justify-between font-bold text-base">
                  <span className="text-stone-800">รวมทั้งหมด</span>
                  <span className="text-orange-500">{formatPrice(total)}</span>
                </div>
              </div>
              <button
                onClick={() => router.push("/checkout")}
                className="w-full btn-primary mt-5 py-3 text-base"
              >
                ดำเนินการชำระเงิน →
              </button>
              <Link href="/products" className="block text-center text-sm text-stone-400 hover:text-orange-500 mt-3 transition-colors">
                ← เลือกซื้อสินค้าต่อ
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
