"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
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
  fulfillmentMethod: string | null;
}

interface Product {
  id: string;
  name: string;
  description: string;
  shortDescription: string | null;
  sourceDescription: string | null;
  price: number;
  normalPrice: number | null;
  stock: number;
  images: string[];
  categoryId: string;
  petTypeId: string | null;
  active: boolean;
  featured: boolean;
  deliveryDays: number;
  warehouseCountry: string | null;
  variants: ProductVariant[];
  tags: { id: string }[];
  source: string | null;
  sourceData: object | null;
  fulfillmentMethod: string;
}

export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [togglingCJ, setTogglingCJ] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  const handleDuplicate = async () => {
    if (!product) return;
    if (!confirm(`คัดลอกสินค้า "${product.name}"?\nสินค้าใหม่จะถูกบันทึกเป็น draft`)) return;
    setDuplicating(true);
    try {
      const res = await fetch(`/api/admin/products/${id}/duplicate`, { method: "POST" });
      const d = await res.json();
      if (d.success) {
        toast.success("คัดลอกสินค้าแล้ว");
        router.push(`/admin/products/${d.data.id}`);
      } else {
        toast.error(d.error ?? "เกิดข้อผิดพลาด");
      }
    } catch {
      toast.error("ไม่สามารถคัดลอกได้");
    } finally {
      setDuplicating(false);
    }
  };

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

  const handleToggleCJ = async () => {
    if (!product) return;
    const isLinked = product.source === "CJ";
    const action = isLinked ? "unlink" : "relink";
    const msg = isLinked
      ? "ยืนยันยกเลิกเชื่อม CJ? สินค้านี้จะถูกจัดการเป็นสต็อกเอง"
      : "เชื่อม CJ ใหม่? ระบบจะ restore cjVid จากข้อมูลเดิม";
    if (!confirm(msg)) return;
    setTogglingCJ(true);
    try {
      const res = await fetch(`/api/admin/products/${id}/toggle-cj`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(action === "unlink" ? "ยกเลิกเชื่อม CJ แล้ว" : "เชื่อม CJ ใหม่แล้ว");
        window.location.reload();
      } else {
        toast.error(data.error || "เกิดข้อผิดพลาด");
      }
    } catch {
      toast.error("ไม่สามารถดำเนินการได้");
    } finally {
      setTogglingCJ(false);
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
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleDuplicate}
            disabled={duplicating}
            className="flex items-center gap-1.5 bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-600 px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
          >
            {duplicating ? "กำลังคัดลอก..." : "📋 คัดลอกสินค้า"}
          </button>
          {product.variants.some((v) => v.cjVid) && (
            <button
              onClick={handleSyncStock}
              disabled={syncing}
              className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            >
              {syncing ? "กำลัง Sync..." : "🔄 Sync Stock จาก CJ"}
            </button>
          )}
          {product.sourceData && (
            <button
              onClick={handleToggleCJ}
              disabled={togglingCJ}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition-colors disabled:opacity-50 ${
                product.source === "CJ"
                  ? "bg-red-50 hover:bg-red-100 border-red-200 text-red-600"
                  : "bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
              }`}
            >
              {togglingCJ ? "..." : product.source === "CJ" ? "🔗 ยกเลิกเชื่อม CJ" : "🔗 เชื่อม CJ ใหม่"}
            </button>
          )}
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-stone-100 p-6 max-w-2xl">
        <ProductForm
          productId={id}
          initialData={{
            name: product.name,
            description: product.description,
            shortDescription: product.shortDescription ?? "",
            sourceDescription: product.sourceDescription ?? "",
            price: product.price.toString(),
            normalPrice: product.normalPrice != null ? product.normalPrice.toString() : "",
            stock: product.stock.toString(),
            images: product.images.join(", "),
            categoryId: product.categoryId,
            petTypeId: product.petTypeId || "",
            active: product.active,
            featured: product.featured,
            deliveryDays: product.deliveryDays.toString(),
            warehouseCountry: product.warehouseCountry ?? "",
            fulfillmentMethod: product.fulfillmentMethod ?? "SELF",
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
              fulfillmentMethod: v.fulfillmentMethod ?? null,
            })),
            tagIds: product.tags.map((t) => t.id),
          }}
        />
      </div>
    </div>
  );
}
