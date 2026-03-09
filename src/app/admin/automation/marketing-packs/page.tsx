"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import toast from "react-hot-toast";

interface PackSummary {
  id: string;
  productId: string;
  productName: string;
  lang: string;
  hooks: string[];
  createdAt: string;
  product: {
    name: string;
    name_th: string | null;
    images: string[];
  };
}

interface ProductOption {
  id: string;
  name: string;
  name_th: string | null;
  images: string[];
}

interface AdAngleInput {
  angle: string;
  headline: string;
  body: string;
}

const emptyForm = () => ({
  lang: "th" as "th" | "en",
  hooks: "",
  captionFacebook: "",
  captionInstagram: "",
  captionLine: "",
  adAngles: [{ angle: "", headline: "", body: "" }] as AdAngleInput[],
  ugcScript: "",
  thumbnailTexts: "",
});

// ─── Manual Add Modal ─────────────────────────────────────────────────────────

function ManualAddModal({
  onClose,
  onSaved,
  initialProductId,
}: {
  onClose: () => void;
  onSaved: (pack: PackSummary) => void;
  initialProductId?: string;
}) {
  const [productSearch, setProductSearch] = useState("");
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!initialProductId) return;
    fetch(`/api/admin/products/${initialProductId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const p = d.data;
          setSelectedProduct({ id: p.id, name: p.name, name_th: p.name_th, images: p.images });
        }
      });
  }, [initialProductId]);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchProducts = (q: string) => {
    setProductSearch(q);
    setShowDropdown(true);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!q.trim()) { setProductOptions([]); return; }
    searchTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/admin/products?search=${encodeURIComponent(q)}&nameOnly=true&limit=20`);
      const data = await res.json();
      setProductOptions(data.products ?? data.data ?? []);
    }, 300);
  };

  const handleSave = async () => {
    if (!selectedProduct) { toast.error("กรุณาเลือกสินค้า"); return; }
    setSaving(true);
    try {
      const hooksArr = form.hooks.split("\n").map((s) => s.trim()).filter(Boolean);
      const thumbArr = form.thumbnailTexts.split("\n").map((s) => s.trim()).filter(Boolean);
      const adAnglesClean = form.adAngles.filter((a) => a.headline.trim());

      const res = await fetch("/api/admin/automation/marketing-packs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProduct.id,
          lang: form.lang,
          productName: selectedProduct.name,
          hooks: hooksArr,
          captionFacebook: form.captionFacebook || null,
          captionInstagram: form.captionInstagram || null,
          captionLine: form.captionLine || null,
          adAngles: adAnglesClean,
          ugcScript: form.ugcScript,
          thumbnailTexts: thumbArr,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("บันทึกแล้ว");
        onSaved({ ...data.data, product: { name: selectedProduct.name, name_th: selectedProduct.name_th, images: selectedProduct.images } });
        onClose();
      } else {
        toast.error(data.error ?? "บันทึกไม่สำเร็จ");
      }
    } finally {
      setSaving(false);
    }
  };

  const updateAngle = (i: number, field: keyof AdAngleInput, val: string) => {
    setForm((f) => {
      const angles = [...f.adAngles];
      angles[i] = { ...angles[i], [field]: val };
      return { ...f, adAngles: angles };
    });
  };

  const addAngle = () => setForm((f) => ({ ...f, adAngles: [...f.adAngles, { angle: "", headline: "", body: "" }] }));
  const removeAngle = (i: number) => setForm((f) => ({ ...f, adAngles: f.adAngles.filter((_, idx) => idx !== i) }));

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Drawer */}
      <div className="relative ml-auto w-full max-w-2xl bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-stone-100 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="font-bold text-stone-800">Add Marketing Pack (Manual)</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-xl leading-none">×</button>
        </div>

        <div className="flex-1 px-6 py-5 space-y-5">
          {/* Product selector */}
          <div className="relative">
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">สินค้า *</label>
            {selectedProduct ? (
              <div className="flex items-center gap-3 border border-stone-200 rounded-xl p-3">
                {selectedProduct.images?.[0] && (
                  <Image src={selectedProduct.images[0]} alt="" width={36} height={36} className="w-9 h-9 rounded-lg object-cover" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-800 truncate">{selectedProduct.name}</p>
                  {selectedProduct.name_th && <p className="text-xs text-stone-400 truncate">{selectedProduct.name_th}</p>}
                </div>
                <button onClick={() => { setSelectedProduct(null); setProductSearch(""); }} className="text-xs text-stone-400 hover:text-red-400">เปลี่ยน</button>
              </div>
            ) : (
              <div className="relative">
                <input
                  value={productSearch}
                  onChange={(e) => searchProducts(e.target.value)}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="ค้นหาชื่อสินค้า..."
                  className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
                {showDropdown && productOptions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-xl shadow-lg z-20 max-h-56 overflow-y-auto">
                    {productOptions.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => { setSelectedProduct(p); setShowDropdown(false); setProductSearch(""); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-orange-50 text-left"
                      >
                        {p.images?.[0] && <Image src={p.images[0]} alt="" width={28} height={28} className="w-7 h-7 rounded-lg object-cover shrink-0" />}
                        <div className="min-w-0">
                          <p className="text-sm text-stone-800 truncate">{p.name}</p>
                          {p.name_th && <p className="text-xs text-stone-400 truncate">{p.name_th}</p>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Language */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">ภาษา</label>
            <div className="flex bg-stone-100 rounded-xl p-1 w-fit">
              {(["th", "en"] as const).map((l) => (
                <button key={l} onClick={() => setForm((f) => ({ ...f, lang: l }))}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors uppercase ${form.lang === l ? "bg-white text-orange-600 shadow-sm" : "text-stone-500"}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Marketing Hooks */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">Marketing Hooks <span className="font-normal text-stone-400">(1 hook ต่อบรรทัด)</span></label>
            <textarea
              value={form.hooks}
              onChange={(e) => setForm((f) => ({ ...f, hooks: e.target.value }))}
              rows={5}
              placeholder={"Hook 1\nHook 2\nHook 3"}
              className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
            />
          </div>

          {/* Social Media Captions */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-stone-600">Social Media Captions</label>
            {([["captionFacebook", "Facebook"], ["captionInstagram", "Instagram"], ["captionLine", "LINE"]] as const).map(([key, label]) => (
              <div key={key}>
                <p className="text-[11px] text-stone-400 mb-1">{label}</p>
                <textarea
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  rows={3}
                  placeholder={`${label} caption...`}
                  className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
                />
              </div>
            ))}
          </div>

          {/* Ad Angles */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-stone-600">Ad Angles</label>
              <button onClick={addAngle} className="text-xs text-orange-500 hover:text-orange-600 font-medium">+ เพิ่ม</button>
            </div>
            <div className="space-y-3">
              {form.adAngles.map((a, i) => (
                <div key={i} className="border border-stone-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-stone-400 font-medium">Angle {i + 1}</span>
                    {form.adAngles.length > 1 && (
                      <button onClick={() => removeAngle(i)} className="text-[11px] text-stone-300 hover:text-red-400">ลบ</button>
                    )}
                  </div>
                  <input
                    value={a.angle}
                    onChange={(e) => updateAngle(i, "angle", e.target.value)}
                    placeholder="Angle name (e.g. Health, Emotion)"
                    className="w-full border border-stone-100 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-orange-200 bg-stone-50"
                  />
                  <input
                    value={a.headline}
                    onChange={(e) => updateAngle(i, "headline", e.target.value)}
                    placeholder="Headline"
                    className="w-full border border-stone-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                  />
                  <textarea
                    value={a.body}
                    onChange={(e) => updateAngle(i, "body", e.target.value)}
                    rows={2}
                    placeholder="Body text"
                    className="w-full border border-stone-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 resize-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* UGC Script */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">UGC Video Script</label>
            <textarea
              value={form.ugcScript}
              onChange={(e) => setForm((f) => ({ ...f, ugcScript: e.target.value }))}
              rows={6}
              placeholder="เขียน script วิดีโอ..."
              className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
            />
          </div>

          {/* Thumbnail Texts */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">Thumbnail Text <span className="font-normal text-stone-400">(1 ข้อความต่อบรรทัด)</span></label>
            <textarea
              value={form.thumbnailTexts}
              onChange={(e) => setForm((f) => ({ ...f, thumbnailTexts: e.target.value }))}
              rows={4}
              placeholder={"ข้อความ 1\nข้อความ 2\nข้อความ 3"}
              className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-stone-100 px-6 py-4 flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving || !selectedProduct}
            className="flex-1 bg-teal-500 hover:bg-teal-600 disabled:bg-stone-300 text-white text-sm py-2.5 rounded-xl font-medium transition-colors"
          >
            {saving ? "กำลังบันทึก..." : "บันทึก Marketing Pack"}
          </button>
          <button onClick={onClose} className="px-4 text-sm text-stone-500 hover:text-stone-700 border border-stone-200 rounded-xl transition-colors">
            ยกเลิก
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MarketingPacksPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filterProductId = searchParams.get("productId") ?? "";
  const [packs, setPacks] = useState<PackSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [filterProduct, setFilterProduct] = useState<{ id: string; name: string; name_th: string | null; images: string[] } | null>(null);

  const fetchPacks = useCallback(async () => {
    setLoading(true);
    try {
      const url = filterProductId
        ? `/api/admin/automation/marketing-packs?productId=${filterProductId}`
        : "/api/admin/automation/marketing-packs";
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setPacks(data.data);
    } finally {
      setLoading(false);
    }
  }, [filterProductId]);

  useEffect(() => {
    fetchPacks();
  }, [fetchPacks]);

  useEffect(() => {
    if (!filterProductId) { setFilterProduct(null); return; }
    fetch(`/api/admin/products/${filterProductId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setFilterProduct({ id: d.data.id, name: d.data.name, name_th: d.data.name_th, images: d.data.images });
      });
  }, [filterProductId]);

  const handleDelete = async (id: string) => {
    if (!confirm("ลบ Marketing Pack นี้?")) return;
    setDeleting(id);
    try {
      await fetch(`/api/admin/automation/marketing-packs/${id}`, { method: "DELETE" });
      setPacks((prev) => prev.filter((p) => p.id !== id));
    } finally {
      setDeleting(null);
    }
  };

  const filtered = packs.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.productName.toLowerCase().includes(q) ||
      p.product.name.toLowerCase().includes(q) ||
      (p.product.name_th ?? "").toLowerCase().includes(q)
    );
  });

  const filteredByProduct = filterProductId
    ? filtered.filter((p) => p.productId === filterProductId)
    : filtered;

  return (
    <>
      {showManualAdd && (
        <ManualAddModal
          onClose={() => setShowManualAdd(false)}
          onSaved={(pack) => setPacks((prev) => [pack, ...prev])}
          initialProductId={filterProductId || undefined}
        />
      )}

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-stone-800">Marketing Packs</h1>
            <p className="text-sm text-stone-500 mt-1">{packs.length} packs</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowManualAdd(true)}
              className="text-sm bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-xl font-medium transition-colors"
            >
              + Manual Add
            </button>
            <button
              onClick={() => router.push("/admin/automation/creative")}
              className="text-sm bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl font-medium transition-colors"
            >
              ✨ AI Generate
            </button>
          </div>
        </div>

        {/* Product context banner */}
        {filterProduct && (
          <div className="flex items-center gap-4 bg-orange-50 border border-orange-100 rounded-2xl p-4">
            {filterProduct.images[0] && (
              <Image src={filterProduct.images[0]} alt="" width={64} height={64} className="w-16 h-16 rounded-xl object-cover shrink-0" unoptimized />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-orange-500 font-semibold uppercase tracking-wide mb-0.5">สินค้า</p>
              <p className="font-semibold text-stone-800 truncate">{filterProduct.name}</p>
              {filterProduct.name_th && filterProduct.name_th !== filterProduct.name && (
                <p className="text-sm text-stone-400 truncate">{filterProduct.name_th}</p>
              )}
              <p className="text-xs text-stone-400 mt-1">{packs.length} pack</p>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <button
                onClick={() => router.push("/admin/products")}
                className="text-xs px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-white transition-colors"
              >
                ← กลับสินค้า
              </button>
              <button
                onClick={() => router.push("/admin/automation/marketing-packs")}
                className="text-xs px-3 py-1.5 rounded-lg border border-stone-200 text-stone-500 hover:bg-white transition-colors"
              >
                ดู Packs ทั้งหมด
              </button>
            </div>
          </div>
        )}

        {/* Search — only show when not filtered by product */}
        {!filterProductId && (
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาสินค้า..."
            className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
        )}

        {/* List */}
        {loading ? (
          <div className="text-center py-16 text-stone-400 text-sm">กำลังโหลด...</div>
        ) : filteredByProduct.length === 0 ? (
          <div className="text-center py-16 text-stone-400">
            <div className="text-4xl mb-3">📦</div>
            <p className="text-sm">ยังไม่มี Marketing Pack</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {filteredByProduct.map((pack) => {
              const img = pack.product.images?.[0];
              const hook = Array.isArray(pack.hooks) ? pack.hooks[0] : null;
              const date = new Date(pack.createdAt).toLocaleDateString("th-TH", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });
              return (
                <div
                  key={pack.id}
                  onClick={() => router.push(`/admin/automation/marketing-packs/${pack.id}`)}
                  className="bg-white border border-stone-200 rounded-2xl overflow-hidden cursor-pointer hover:shadow-md hover:border-orange-200 transition-all group flex flex-col"
                >
                  {/* Product image */}
                  <div className="w-full h-40 bg-stone-100 overflow-hidden">
                    {img
                      ? <Image src={img} alt={pack.productName} width={300} height={160} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      : <div className="w-full h-full flex items-center justify-center text-stone-300 text-3xl">📦</div>
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 p-3">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="min-w-0">
                        <p className="font-semibold text-stone-800 text-sm truncate">{pack.productName}</p>
                        {pack.product.name_th && pack.product.name_th !== pack.productName && (
                          <p className="text-xs text-stone-400 truncate">{pack.product.name_th}</p>
                        )}
                      </div>
                      <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${pack.lang === "en" ? "bg-blue-100 text-blue-600" : "bg-amber-100 text-amber-600"}`}>
                        {pack.lang}
                      </span>
                    </div>
                    {hook && (
                      <p className="text-xs text-stone-500 mt-1.5 line-clamp-2">{hook}</p>
                    )}
                    <p className="text-[10px] text-stone-400 font-mono mt-1.5">#{pack.id.slice(0, 8)}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[11px] text-stone-400">{date}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(pack.id); }}
                        disabled={deleting === pack.id}
                        className="text-[11px] text-stone-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        {deleting === pack.id ? "กำลังลบ..." : "ลบ"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
