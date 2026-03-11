"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import Image from "next/image";
import MarketingAssetsSection from "@/components/admin/MarketingAssetsSection";
import toast from "react-hot-toast";

interface ProductVariant {
  id: string;
  size: string | null;
  color: string | null;
  price: number;
  stock: number;
  sku: string | null;
  active: boolean;
  variantImage: string | null;
}

interface Category {
  id: string;
  name: string;
  name_th: string | null;
}

type PetType = {
  id: string;
  name: string;
  name_th: string | null;
} | null;

interface ProductDetail {
  id: string;
  shopId: string;
  name: string;
  name_th: string | null;
  description: string;
  description_th: string | null;
  shortDescription: string | null;
  price: number;
  normalPrice: number | null;
  stock: number;
  images: string[];
  videos: string[];
  active: boolean;
  featured: boolean;
  deliveryDays: number;
  fulfillmentMethod: string;
  category: Category;
  petType: PetType;
  variants: ProductVariant[];
  _count?: { marketingAssets: number };
}

export default function ProductViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [addingAll, setAddingAll] = useState(false);

  const fetchProduct = () => {
    fetch(`/api/admin/products/${id}`)
      .then((r) => r.json())
      .then((d) => d.success && setProduct(d.data));
  };

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const handleAddAllToMarketingAssets = async () => {
    setAddingAll(true);
    try {
      const res = await fetch(`/api/admin/products/${id}/add-images-to-marketing-assets`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        const msg = data.data.created > 0
          ? `เพิ่ม ${data.data.created} รูปใน marketing assets แล้ว`
          : "รูปทั้งหมดอยู่ใน marketing assets แล้ว";
        toast.success(msg);
        fetchProduct();
      }
    } finally {
      setAddingAll(false);
    }
  };

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-stone-100 rounded w-48" />
          <div className="h-48 bg-stone-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  const mainImage = product.images[0];
  const displayPrice = product.normalPrice ?? product.price;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href={`/admin/products/${id}`} className="text-stone-400 hover:text-stone-600">
            ← แก้ไขสินค้า
          </Link>
          <h1 className="text-2xl font-bold text-stone-800">รายละเอียดสินค้า: {product.name_th ?? product.name}</h1>
        </div>
        <button
          onClick={handleAddAllToMarketingAssets}
          disabled={addingAll || (product.images.length === 0 && product.variants.every((v) => !v.variantImage))}
          className="btn-outline text-sm py-2 px-4"
        >
          {addingAll ? "กำลังเพิ่ม..." : "เพิ่มรูปทั้งหมดเข้า Marketing Assets"}
        </button>
      </div>

      {/* Product hero */}
      <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
        <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6">
          <div className="relative w-full md:w-64 aspect-square rounded-xl overflow-hidden bg-stone-50 shrink-0">
            {mainImage ? (
              <Image src={mainImage} alt={product.name} fill className="object-contain" sizes="256px" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl text-stone-300">📦</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-stone-800">{product.name_th ?? product.name}</h2>
            <p className="text-stone-500 text-sm mt-0.5">{product.name}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="text-xs px-2 py-1 rounded-full bg-stone-100 text-stone-600">
                {product.category.name_th ?? product.category.name}
              </span>
              {product.petType && (
                <span className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700">
                  {product.petType.name_th ?? product.petType.name}
                </span>
              )}
              {product.featured && (
                <span className="text-xs px-2 py-1 rounded-full bg-purple-50 text-purple-700">Featured</span>
              )}
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-xl font-bold text-stone-800">฿{displayPrice.toLocaleString()}</span>
              {product.normalPrice != null && product.normalPrice > product.price && (
                <span className="text-sm text-stone-400 line-through">฿{product.normalPrice.toLocaleString()}</span>
              )}
            </div>
            <p className="text-sm text-stone-600 mt-2">
              สต็อกรวม: {product.stock} · จัดส่งภายใน {product.deliveryDays} วัน
              {product._count?.marketingAssets != null && (
                <>
                  {" · "}
                  <a href="#marketing-assets" className="text-orange-500 hover:text-orange-600 hover:underline">
                    {product._count.marketingAssets} marketing assets
                  </a>
                </>
              )}
            </p>
            {product.shortDescription && (
              <p className="text-sm text-stone-600 mt-3 line-clamp-3">{product.shortDescription}</p>
            )}
          </div>
        </div>
      </div>

      {/* Variant images gallery */}
      {product.variants.some((v) => v.variantImage) && (
        <div className="bg-white rounded-2xl border border-stone-100 p-5">
          <h3 className="font-semibold text-stone-800 mb-3">รูปตัวเลือกสินค้า</h3>
          <div className="flex flex-wrap gap-3">
            {product.variants
              .filter((v) => v.variantImage)
              .map((v) => (
                <div key={v.id} className="flex flex-col items-center gap-1.5">
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-stone-100 border border-stone-100">
                    <Image src={v.variantImage!} alt={[v.size, v.color].filter(Boolean).join(" ") || "variant"} fill className="object-cover" sizes="80px" />
                  </div>
                  <span className="text-[11px] text-stone-500">
                    {[v.size, v.color].filter(Boolean).join(" / ") || "—"}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Variants */}
      {product.variants.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-100 p-5">
          <h3 className="font-semibold text-stone-800 mb-3">ตัวเลือกสินค้า</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100">
                  <th className="text-left py-2 text-stone-500 font-medium w-16">รูป</th>
                  <th className="text-left py-2 text-stone-500 font-medium">Size / Color</th>
                  <th className="text-right py-2 text-stone-500 font-medium">ราคา</th>
                  <th className="text-right py-2 text-stone-500 font-medium">สต็อก</th>
                  <th className="text-left py-2 text-stone-500 font-medium">SKU</th>
                </tr>
              </thead>
              <tbody>
                {product.variants.map((v) => (
                  <tr key={v.id} className="border-b border-stone-50 last:border-0">
                    <td className="py-2">
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-stone-100 shrink-0">
                        {v.variantImage ? (
                          <Image src={v.variantImage} alt={[v.size, v.color].filter(Boolean).join(" ") || "variant"} fill className="object-cover" sizes="48px" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-stone-300 text-lg">📦</div>
                        )}
                      </div>
                    </td>
                    <td className="py-2">
                      {[v.size, v.color].filter(Boolean).join(" / ") || "—"}
                    </td>
                    <td className="text-right py-2">฿{v.price.toLocaleString()}</td>
                    <td className="text-right py-2">{v.stock}</td>
                    <td className="py-2 text-stone-500">{v.sku ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Description */}
      {product.description && (
        <div className="bg-white rounded-2xl border border-stone-100 p-5">
          <h3 className="font-semibold text-stone-800 mb-2">รายละเอียด</h3>
          <div className="text-sm text-stone-600 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: product.description }} />
        </div>
      )}

      {/* Marketing Assets */}
      <MarketingAssetsSection
        productId={id}
        productImages={product.images}
        productVideos={product.videos ?? []}
        onDisplayChange={fetchProduct}
        count={product._count?.marketingAssets}
      />
    </div>
  );
}
