"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { AdImageDesigner, type AdImageDesignerProduct } from "@/components/admin/AdImageDesigner";
import { AD_TEMPLATES } from "@/lib/adDesignerTemplates";
import type { AdTemplateState } from "@/lib/adDesignerTemplates";

const MY_TEMPLATES_KEY = "ad-designer-my-templates";
type SavedTemplate = { id: string; name: string; state: AdTemplateState };

export default function AdDesignerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get("productId");
  const marketingPackId = searchParams.get("marketingPackId") || undefined;
  const returnUrl = searchParams.get("returnUrl") || (productId ? `/admin/products/${productId}/view` : "/admin/products");

  const [product, setProduct] = useState<AdImageDesignerProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedSavedTemplate, setSelectedSavedTemplate] = useState<SavedTemplate | null>(null);
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(MY_TEMPLATES_KEY);
      if (raw) setSavedTemplates(JSON.parse(raw));
    } catch {
      setSavedTemplates([]);
    }
  }, []);

  useEffect(() => {
    if (!productId) {
      setError("ไม่มี productId");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(`/api/admin/products/${productId}`, { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/admin/marketing-assets?productId=${productId}&limit=100`, { cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([productRes, assetsRes]) => {
        if (!productRes.success || !productRes.data) {
          setError(productRes.error || "โหลดสินค้าไม่สำเร็จ");
          setProduct(null);
          return;
        }
        const p = productRes.data;
        const productImages = p.images ?? [];
        let images = productImages;
        if (assetsRes.success && Array.isArray(assetsRes.data) && assetsRes.data.length > 0) {
          const assetUrls = assetsRes.data
            .filter((a: { type?: string; url?: string }) => a.type === "IMAGE" && a.url)
            .map((a: { url: string }) => a.url);
          images = assetUrls.length > 0 ? assetUrls : productImages;
        }
        setProduct({
          id: p.id,
          name: p.name,
          name_th: p.name_th ?? undefined,
          shortDescription: p.shortDescription ?? undefined,
          shortDescription_th: p.shortDescription_th ?? undefined,
          price: p.price,
          normalPrice: p.normalPrice ?? undefined,
          images,
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

  if (selectedTemplateId === null && !selectedSavedTemplate) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-stone-800">เลือกเทมเพลต Ads</h1>
          <Link href={returnUrl} className="text-sm text-stone-500 hover:text-stone-700">
            ← กลับ
          </Link>
        </div>
        <p className="text-sm text-stone-500 mb-4">เลือกเทมเพลตเพื่อเริ่มออกแบบ หรือเริ่มจากหน้าว่าง</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => setSelectedTemplateId("")}
            className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-stone-200 hover:border-orange-300 hover:bg-orange-50/50 text-stone-500 hover:text-orange-700 transition-colors"
          >
            <span className="text-3xl mb-2">📄</span>
            <span className="text-sm font-medium">เริ่มจากหน้าว่าง</span>
          </button>
          {AD_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedTemplateId(t.id)}
              className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-stone-200 hover:border-orange-400 hover:bg-orange-50/50 transition-colors text-left"
            >
              <span className="text-2xl mb-2">{t.id === "sale" ? "🏷️" : t.id === "freeshipping" ? "🚚" : t.id === "new" ? "✨" : t.id === "bestseller" ? "🔥" : t.id === "flash" ? "⚡" : "📦"}</span>
              <span className="text-sm font-semibold text-stone-800">{t.labelTh}</span>
              <span className="text-xs text-stone-500">{t.labelEn}</span>
            </button>
          ))}
          {savedTemplates.map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setSelectedSavedTemplate(st)}
              className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-stone-200 hover:border-emerald-400 hover:bg-emerald-50/50 transition-colors text-left"
            >
              <span className="text-2xl mb-2">💾</span>
              <span className="text-sm font-semibold text-stone-800">{st.name}</span>
              <span className="text-xs text-stone-500">My template</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-2rem)] overflow-hidden flex flex-col p-4 md:p-6">
      <div className="flex-1 min-h-0 flex justify-center">
        <div className="h-full w-full max-w-[1400px]">
          <AdImageDesigner
            product={product}
            context={marketingPackId ? { marketingPackId } : undefined}
            onSaved={handleSaved}
            backHref={returnUrl}
            initialTemplateId={selectedSavedTemplate ? undefined : selectedTemplateId || undefined}
            initialTemplateState={selectedSavedTemplate?.state ?? undefined}
          />
        </div>
      </div>
    </div>
  );
}
