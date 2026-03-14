"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { AdImageDesigner, type AdImageDesignerProduct } from "@/components/admin/AdImageDesigner";

export default function AdDesignerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get("productId");
  const marketingPackId = searchParams.get("marketingPackId") || undefined;
  const returnUrl = searchParams.get("returnUrl") || (productId ? `/admin/products/${productId}/view` : "/admin/products");

  const [product, setProduct] = useState<AdImageDesignerProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!productId) {
      setError("ไม่มี productId");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`/api/admin/products/${productId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!d.success || !d.data) {
          setError(d.error || "โหลดสินค้าไม่สำเร็จ");
          setProduct(null);
          return;
        }
        const p = d.data;
        setProduct({
          id: p.id,
          name: p.name,
          name_th: p.name_th ?? undefined,
          shortDescription: p.shortDescription ?? undefined,
          shortDescription_th: p.shortDescription_th ?? undefined,
          price: p.price,
          normalPrice: p.normalPrice ?? undefined,
          images: p.images ?? [],
          shopLogoUrl: null,
        });
      })
      .catch((err) => {
        console.error("[AdDesignerPage]", err);
        setError("โหลดสินค้าไม่สำเร็จ");
        setProduct(null);
      })
      .finally(() => setLoading(false));
  }, [productId]);

  const handleSaved = () => {
    toast.success("บันทึกภาพ Ads เข้า Marketing Assets แล้ว");
    router.push(returnUrl);
  };

  if (!productId) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-100 rounded-xl p-6 text-center">
          <p className="text-red-700 font-medium">ไม่มี productId</p>
          <Link href="/admin/products" className="mt-4 inline-block text-sm text-orange-600 hover:underline">
            กลับไปรายการสินค้า
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[200px]">
        <p className="text-stone-500">กำลังโหลด...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-100 rounded-xl p-6 text-center">
          <p className="text-red-700 font-medium">{error || "ไม่พบสินค้า"}</p>
          <Link href={returnUrl} className="mt-4 inline-block text-sm text-orange-600 hover:underline">
            กลับ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 flex justify-center">
      <AdImageDesigner
        product={product}
        context={marketingPackId ? { marketingPackId } : undefined}
        onSaved={handleSaved}
        backHref={returnUrl}
      />
    </div>
  );
}
