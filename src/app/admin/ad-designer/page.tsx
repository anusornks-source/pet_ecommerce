"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { AdImageDesigner, type AdImageDesignerProduct } from "@/components/admin/AdImageDesigner";
import { AD_TEMPLATES } from "@/lib/adDesignerTemplates";
import type { AdTemplateState } from "@/lib/adDesignerTemplates";

export type AdDesignSummary = {
  id: string;
  name: string;
  note: string | null;
  state: AdTemplateState;
  createdAt: string;
  updatedAt: string;
};

export default function AdDesignerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productIdParam = searchParams.get("productId");
  const adDesignIdParam = searchParams.get("adDesignId");
  const marketingPackId = searchParams.get("marketingPackId") || undefined;
  const returnUrl =
    searchParams.get("returnUrl") ||
    (productIdParam ? `/admin/products/${productIdParam}/view` : "/admin/automation/ad-designs");

  const [product, setProduct] = useState<AdImageDesignerProduct | null>(null);
  const [shopName, setShopName] = useState<string | null>(null);
  const [productId, setProductId] = useState<string | null>(productIdParam);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedAdDesign, setSelectedAdDesign] = useState<AdDesignSummary | null>(null);
  const [adDesigns, setAdDesigns] = useState<AdDesignSummary[]>([]);
  const [adDesignSearch, setAdDesignSearch] = useState("");
  const [editingAdDesign, setEditingAdDesign] = useState<{ id: string; name: string; note: string } | null>(null);

  const fetchAdDesigns = useCallback(async () => {
    if (!productId) return;
    const res = await fetch(`/api/admin/products/${productId}/ad-designs`, { cache: "no-store" });
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      setAdDesigns(json.data as AdDesignSummary[]);
    }
  }, [productId]);

  const loadProductAndDesigns = useCallback(
    (pid: string, preselectedDesign: AdDesignSummary | null) => {
      setLoading(true);
      setError(null);
      setProductId(pid);
      Promise.all([
        fetch(`/api/admin/products/${pid}`, { cache: "no-store" }).then((r) => r.json()),
        fetch(`/api/admin/marketing-assets?productId=${pid}&limit=100`, { cache: "no-store" }).then((r) => r.json()),
        fetch(`/api/admin/products/${pid}/ad-designs`, { cache: "no-store" }).then((r) => r.json()),
      ])
        .then(([productRes, assetsRes, adDesignsRes]) => {
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
          setShopName(p.shop?.name ?? null);
          if (adDesignsRes.success && Array.isArray(adDesignsRes.data)) {
            setAdDesigns(adDesignsRes.data as AdDesignSummary[]);
          }
          if (preselectedDesign) {
            setSelectedAdDesign(preselectedDesign);
          }
        })
        .catch((err) => {
          console.error("[AdDesignerPage]", err);
          setError("โหลดสินค้าไม่สำเร็จ");
          setProduct(null);
        })
        .finally(() => setLoading(false));
    },
    []
  );

  useEffect(() => {
    if (adDesignIdParam) {
      fetch(`/api/admin/ad-designs/${adDesignIdParam}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((designRes) => {
          if (!designRes.success || !designRes.data) {
            setError(designRes.error || "ไม่พบ Ad Design");
            setLoading(false);
            return;
          }
          const d = designRes.data;
          const summary: AdDesignSummary = {
            id: d.id,
            name: d.name,
            note: d.note ?? null,
            state: d.state,
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
          };
          loadProductAndDesigns(d.productId, summary);
        })
        .catch(() => {
          setError("โหลด Ad Design ไม่สำเร็จ");
          setLoading(false);
        });
      return;
    }
    if (!productIdParam) {
      setError("ไม่มี productId หรือ adDesignId");
      setLoading(false);
      return;
    }
    loadProductAndDesigns(productIdParam, null);
  }, [productIdParam, adDesignIdParam, loadProductAndDesigns]);

  const handleSaved = () => {
    toast.success("บันทึกภาพ Ads เข้า Marketing Assets แล้ว");
    router.push(returnUrl);
  };

  const handleSaveAdDesign = useCallback(
    async (payload: { name: string; state: AdTemplateState }) => {
      if (!productId) return;
      const res = await fetch(`/api/admin/products/${productId}/ad-designs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || "บันทึก Ad Design ไม่สำเร็จ");
        return;
      }
      toast.success("บันทึก Ad Design แล้ว");
      await fetchAdDesigns();
    },
    [productId, fetchAdDesigns]
  );

  const handleUpdateAdDesign = useCallback(
    async (payload: { id: string; state: AdTemplateState }) => {
      const res = await fetch(`/api/admin/ad-designs/${payload.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: payload.state }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || "อัปเดตไม่สำเร็จ");
        return;
      }
      toast.success("อัปเดต Ad Design แล้ว");
      await fetchAdDesigns();
      setSelectedAdDesign((prev) =>
        prev && prev.id === payload.id
          ? { ...prev, state: payload.state, updatedAt: (json.data?.updatedAt as string) ?? prev.updatedAt }
          : prev
      );
    },
    [fetchAdDesigns]
  );

  const handleUpdateAdDesignMeta = useCallback(
    async (id: string, payload: { name: string; note: string | null }) => {
      const res = await fetch(`/api/admin/ad-designs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: payload.name.trim(), note: payload.note?.trim() || null }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || "บันทึกไม่สำเร็จ");
        return;
      }
      toast.success("บันทึกชื่อและหมายเหตุแล้ว");
      await fetchAdDesigns();
      setSelectedAdDesign((prev) =>
        prev && prev.id === id ? { ...prev, name: payload.name.trim(), note: payload.note?.trim() || null } : prev
      );
    },
    [fetchAdDesigns]
  );

  const handleDeleteAdDesign = useCallback(
    async (id: string) => {
      if (!confirm("ลบ Ad Design นี้?")) return;
      const res = await fetch(`/api/admin/ad-designs/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || "ลบไม่สำเร็จ");
        return;
      }
      toast.success("ลบแล้ว");
      await fetchAdDesigns();
      setSelectedAdDesign((prev) => (prev?.id === id ? null : prev));
    },
    [fetchAdDesigns]
  );

  if (!adDesignIdParam && !productIdParam) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-100 rounded-xl p-6 text-center">
          <p className="text-red-700 font-medium">ไม่มี productId หรือ adDesignId</p>
          <Link href="/admin/automation/ad-designs" className="mt-4 inline-block text-sm text-orange-600 hover:underline">
            กลับไป Ad Designs
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

  const showTemplatePicker = selectedTemplateId === null && !selectedAdDesign;

  if (showTemplatePicker) {
    return (
      <div className="p-4 md:p-6 max-w-[90rem] w-full mx-auto">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold text-stone-800">เลือกเทมเพลต Ads</h1>
            {product && (
              <>
                <p className="text-sm text-stone-500 mt-1">
                  {[shopName, product.name_th || product.name].filter(Boolean).join(" : ")}
                </p>
                <div className="mt-3 flex flex-wrap items-start gap-3">
                  {product.images?.[0] && (
                    <img
                      src={product.images[0]}
                      alt=""
                      className="w-16 h-16 rounded-lg object-cover border border-stone-200 shrink-0"
                    />
                  )}
                  <div className="min-w-0 text-sm">
                    <p className="text-stone-400 font-mono text-xs">
                      ID: {product.id}
                    </p>
                    {(product.shortDescription_th ?? product.shortDescription) && (
                      <p className="text-stone-600 mt-1 line-clamp-2">
                        {product.shortDescription_th ?? product.shortDescription}
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          <Link href={returnUrl} className="text-sm text-stone-500 hover:text-stone-700 shrink-0">
            ← กลับ
          </Link>
        </div>

        <section className="mb-8">
          <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">เทมเพลต (Preset)</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
            <button
              type="button"
              onClick={() => setSelectedTemplateId("")}
              className="flex flex-col items-center justify-center p-3 rounded-lg border-2 border-dashed border-stone-200 hover:border-orange-300 hover:bg-orange-50/50 text-stone-500 hover:text-orange-700 transition-colors"
            >
              <span className="text-xl mb-1">📄</span>
              <span className="text-xs font-medium">เริ่มจากหน้าว่าง</span>
            </button>
            {AD_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTemplateId(t.id)}
                className="flex flex-col items-center justify-center p-3 rounded-lg border-2 border-stone-200 hover:border-orange-400 hover:bg-orange-50/50 transition-colors text-left"
              >
                <span className="text-lg mb-1">{t.id === "sale" ? "🏷️" : t.id === "freeshipping" ? "🚚" : t.id === "new" ? "✨" : t.id === "bestseller" ? "🔥" : t.id === "flash" ? "⚡" : "📦"}</span>
                <span className="text-xs font-semibold text-stone-800">{t.labelTh}</span>
                <span className="text-[10px] text-stone-500">{t.labelEn}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">Ad Design ที่บันทึกไว้ (ของสินค้านี้)</h3>
          {adDesigns.length === 0 ? (
            <p className="text-sm text-stone-400">ยังไม่มี Ad Design — บันทึกจากหน้าแก้ไขแล้วจะแสดงที่นี่</p>
          ) : (
            <>
              <div className="mb-3">
                <input
                  type="search"
                  placeholder="ค้นหาชื่อ Ad Design..."
                  value={adDesignSearch}
                  onChange={(e) => setAdDesignSearch(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400"
                />
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
                {adDesigns
                  .filter((ad) => !adDesignSearch.trim() || ad.name.toLowerCase().includes(adDesignSearch.trim().toLowerCase()))
                  .map((ad) => (
                    <div
                      key={ad.id}
                      className="group relative flex flex-col p-3 rounded-lg border-2 border-violet-200 bg-violet-50/30 hover:border-violet-400 hover:bg-violet-50/60 transition-colors"
                    >
                      {editingAdDesign?.id === ad.id ? (
                        <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                          <div>
                            <label className="block text-[10px] text-stone-500 mb-0.5">ชื่อ</label>
                            <input
                              type="text"
                              value={editingAdDesign.name}
                              onChange={(e) => setEditingAdDesign((p) => (p ? { ...p, name: e.target.value } : null))}
                              className="w-full px-2 py-1 text-xs rounded border border-stone-200 focus:outline-none focus:ring-1 focus:ring-violet-300"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-stone-500 mb-0.5">หมายเหตุ</label>
                            <textarea
                              rows={3}
                              value={editingAdDesign.note}
                              onChange={(e) => setEditingAdDesign((p) => (p ? { ...p, note: e.target.value } : null))}
                              placeholder="ถ้ามี"
                              className="w-full px-2 py-1 text-xs rounded border border-stone-200 focus:outline-none focus:ring-1 focus:ring-violet-300 resize-y min-h-[4rem]"
                            />
                          </div>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (!editingAdDesign.name.trim()) return;
                                handleUpdateAdDesignMeta(editingAdDesign.id, {
                                  name: editingAdDesign.name.trim(),
                                  note: editingAdDesign.note.trim() || null,
                                });
                                setEditingAdDesign(null);
                              }}
                              disabled={!editingAdDesign.name.trim()}
                              className="flex-1 px-2 py-1 text-xs rounded bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
                            >
                              บันทึก
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingAdDesign(null)}
                              className="px-2 py-1 text-xs rounded border border-stone-200 text-stone-600 hover:bg-stone-100"
                            >
                              ยกเลิก
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => setSelectedAdDesign(ad)}
                            className="flex flex-col items-center justify-center w-full text-left min-h-[4rem]"
                          >
                            <span className="text-lg mb-1">🎨</span>
                            <span className="text-xs font-semibold text-stone-800 line-clamp-2">{ad.name}</span>
                            <span className="text-[10px] text-violet-600 mt-0.5 line-clamp-2">
                              {ad.note?.trim() || "โหลดมาแก้ต่อ"}
                            </span>
                          </button>
                          <div className="absolute top-1.5 right-1.5 flex gap-0.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingAdDesign({ id: ad.id, name: ad.name, note: ad.note ?? "" });
                              }}
                              className="p-1 rounded text-stone-400 hover:text-violet-600 hover:bg-violet-100 transition-colors"
                              title="แก้ไขชื่อ/หมายเหตุ"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm("ลบ Ad Design นี้?")) handleDeleteAdDesign(ad.id);
                              }}
                              className="p-1 rounded text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="ลบ"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
              </div>
              {adDesigns.filter((ad) => !adDesignSearch.trim() || ad.name.toLowerCase().includes(adDesignSearch.trim().toLowerCase())).length === 0 && (
                <p className="text-sm text-stone-400">ไม่พบ Ad Design ที่ตรงกับคำค้น</p>
              )}
            </>
          )}
        </section>
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
            initialTemplateId={selectedAdDesign ? undefined : selectedTemplateId || undefined}
            initialTemplateState={selectedAdDesign?.state ?? undefined}
            initialAdDesignId={selectedAdDesign?.id ?? undefined}
            initialAdDesignName={selectedAdDesign?.name ?? undefined}
            initialAdDesignNote={selectedAdDesign?.note ?? undefined}
            onSaveAdDesign={handleSaveAdDesign}
            onUpdateAdDesign={handleUpdateAdDesign}
            onUpdateAdDesignMeta={handleUpdateAdDesignMeta}
            onDeleteAdDesign={handleDeleteAdDesign}
          />
        </div>
      </div>
    </div>
  );
}
