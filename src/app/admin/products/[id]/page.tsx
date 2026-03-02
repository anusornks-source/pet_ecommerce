"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import ProductForm from "../ProductForm";
import toast from "react-hot-toast";

interface ProductVariant {
  id: string;
  size: string | null;
  color: string | null;
  price: number;
  stock: number;
  sku: string | null;
  cjVid: string | null;
  cjStock: number | null;
  variantImage: string | null;
  attributes: { name: string; value: string }[] | null;
  active: boolean;
}

interface Product {
  id: string;
  name: string;
  description: string;
  shortDescription: string | null;
  sourceDescription: string | null;
  price: number;
  stock: number;
  images: string[];
  categoryId: string;
  petTypeId: string | null;
  active: boolean;
  featured: boolean;
  deliveryDays: number;
  warehouseCountry: string | null;
  variants: ProductVariant[];
}

export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showSourceDesc, setShowSourceDesc] = useState(false);

  const handleSyncStock = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`/api/admin/products/${id}/sync-stock`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success(`อัปเดตสต็อกแล้ว ${data.data.updated}/${data.data.total} variants`);
        // Reload page to show updated stock
        window.location.reload();
      } else {
        toast.error(data.error || "เกิดข้อผิดพลาด");
      }
    } catch {
      toast.error("ไม่สามารถ sync ได้");
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetch(`/api/admin/products/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setProduct(d.data);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-stone-400 text-sm">กำลังโหลด...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-16 text-stone-400">ไม่พบสินค้า</div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">แก้ไขสินค้า</h1>
          <p className="text-stone-500 text-sm mt-1">{product.name}</p>
        </div>
        {product.variants.some((v) => v.cjVid) && (
          <button
            onClick={handleSyncStock}
            disabled={syncing}
            className="shrink-0 flex items-center gap-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
          >
            {syncing ? "กำลัง Sync..." : "🔄 Sync Stock จาก CJ"}
          </button>
        )}
      </div>
      {/* Source Description Reference Panel — collapsible, default hidden */}
      {product.sourceDescription && (
        <div className="mb-4 max-w-2xl border border-stone-200 rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowSourceDesc((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-3 bg-stone-50 hover:bg-stone-100 transition-colors text-sm font-medium text-stone-600"
          >
            <span>📄 รายละเอียดจาก CJ (ต้นฉบับ — คัดลอกเพื่อแก้ไข)</span>
            <span className="text-stone-400 text-xs">{showSourceDesc ? "ซ่อน ▲" : "ดู ▼"}</span>
          </button>
          {showSourceDesc && (
            <div
              className="p-5 text-sm text-stone-600 leading-relaxed max-h-72 overflow-y-auto bg-white [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-2 [&_p]:mb-2"
              dangerouslySetInnerHTML={{ __html: product.sourceDescription }}
            />
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-stone-100 p-6 max-w-2xl">
        <ProductForm
          productId={id}
          initialData={{
            name: product.name,
            description: product.description,
            shortDescription: product.shortDescription ?? "",
            price: product.price.toString(),
            stock: product.stock.toString(),
            images: product.images.join(", "),
            categoryId: product.categoryId,
            petTypeId: product.petTypeId || "",
            active: product.active,
            featured: product.featured,
            deliveryDays: product.deliveryDays.toString(),
            warehouseCountry: product.warehouseCountry ?? "",
            variants: product.variants.map((v) => ({
              id: v.id,
              size: v.size ?? "",
              color: v.color ?? "",
              price: v.price.toString(),
              stock: v.stock.toString(),
              sku: v.sku ?? "",
              cjVid: v.cjVid ?? "",
              cjStock: v.cjStock ?? null,
              variantImage: v.variantImage ?? "",
              attributes: v.attributes ?? null,
              active: v.active,
            })),
          }}
        />
      </div>
    </div>
  );
}
