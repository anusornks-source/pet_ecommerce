"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ProductValidationStatus } from "@/generated/prisma/enums";
import { SupplierProductImageField } from "@/components/admin/SupplierProductImageField";

type ValidationStatus = "Lead" | "Qualified" | "Approved" | "Rejected";

const STATUS_COLORS: Record<string, string> = {
  [ProductValidationStatus.Lead]: "bg-stone-100 text-stone-700",
  [ProductValidationStatus.Qualified]: "bg-amber-100 text-amber-700",
  [ProductValidationStatus.Approved]: "bg-green-100 text-green-700",
  [ProductValidationStatus.Rejected]: "bg-red-100 text-red-700",
};

const VALIDATION_STATUSES = (Object.values(ProductValidationStatus) as string[]).map((value) => ({
  value,
  label: value,
  color: STATUS_COLORS[value] ?? "bg-stone-100 text-stone-700",
}));

interface SupplierSummary {
  id: string;
  name: string;
  nameTh: string | null;
}

interface SupplierProductDetail {
  id: string;
  supplierId: string;
  name: string;
  name_th: string | null;
  description: string;
  description_th: string | null;
  shortDescription: string | null;
  shortDescription_th: string | null;
  supplierSku: string | null;
  supplierUrl: string | null;
  supplierPrice: number | null;
  images: string[];
  categoryId: string | null;
  remark: string | null;
  validationStatus: ValidationStatus;
  supplier: SupplierSummary;
}

export default function EditSupplierProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sp, setSp] = useState<SupplierProductDetail | null>(null);
  const [descPreview, setDescPreview] = useState(false);
  const [descPreviewTh, setDescPreviewTh] = useState(false);
  const [aiTarget, setAiTarget] = useState<string | null>(null);

  const [form, setForm] = useState<{
    name: string;
    name_th: string;
    description: string;
    description_th: string;
    shortDescription: string;
    shortDescription_th: string;
    supplierSku: string;
    supplierUrl: string;
    supplierPrice: string;
    imagesText: string;
    categoryId: string;
    remark: string;
    validationStatus: ValidationStatus;
  }>({
    name: "",
    name_th: "",
    description: "",
    description_th: "",
    shortDescription: "",
    shortDescription_th: "",
    supplierSku: "",
    supplierUrl: "",
    supplierPrice: "",
    imagesText: "",
    categoryId: "",
    remark: "",
    validationStatus: ProductValidationStatus.Lead,
  });

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/supplier-products/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.success || !d.data) {
          toast.error(d.error || "ไม่พบ Supplier Product");
          return;
        }
        const data = d.data as SupplierProductDetail;
        setSp(data);
        setForm({
          name: data.name,
          name_th: data.name_th ?? "",
          description: data.description ?? "",
          description_th: data.description_th ?? "",
          shortDescription: data.shortDescription ?? "",
          shortDescription_th: data.shortDescription_th ?? "",
          supplierSku: data.supplierSku ?? "",
          supplierUrl: data.supplierUrl ?? "",
          supplierPrice: data.supplierPrice != null ? String(data.supplierPrice) : "",
          imagesText: Array.isArray(data.images) ? data.images.join(", ") : "",
          categoryId: data.categoryId ?? "",
          remark: data.remark ?? "",
          validationStatus: (data.validationStatus ?? ProductValidationStatus.Lead) as ValidationStatus,
        });
      })
      .catch(() => toast.error("โหลด Supplier Product ไม่สำเร็จ"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sp) return;
    if (!form.name.trim() || !form.description.trim()) {
      toast.error("กรุณากรอกชื่อและคำอธิบาย (EN)");
      return;
    }
    setSaving(true);
    try {
      const images = form.imagesText
        .trim()
        .split(/[\s,]+/)
        .map((u) => u.trim())
        .filter(Boolean);
      const res = await fetch(`/api/admin/suppliers/${sp.supplierId ?? sp.supplier.id}/supplier-products/${sp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          name_th: form.name_th || null,
          description: form.description,
          description_th: form.description_th || null,
          shortDescription: form.shortDescription || null,
          shortDescription_th: form.shortDescription_th || null,
          supplierSku: form.supplierSku || null,
          supplierUrl: form.supplierUrl || null,
          supplierPrice: form.supplierPrice ? parseFloat(form.supplierPrice) : null,
          images,
          categoryId: form.categoryId || null,
          remark: form.remark || null,
          validationStatus: form.validationStatus || ProductValidationStatus.Lead,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("บันทึกแล้ว");
        router.push(`/admin/supplier-products/${sp.id}/view`);
      } else {
        toast.error(data.error || "บันทึกไม่สำเร็จ");
      }
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  };

  const suggestField = async (field: string, ctx: Record<string, string>, setter: (v: string) => void) => {
    setAiTarget(field);
    try {
      const res = await fetch("/api/admin/ai/suggest-field", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, ...ctx }),
      });
      const data = await res.json();
      if (data.success && data.value) setter(data.value);
      else toast.error(data.error || "AI ไม่สามารถสร้างได้");
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setAiTarget(null);
    }
  };

  if (loading || !sp) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center py-16 text-stone-400">{loading ? "Loading..." : "ไม่พบ Supplier Product"}</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/admin/supplier-products" className="text-sm text-stone-500 hover:text-stone-700">
            ← Supplier Products
          </Link>
          <span className="text-xs text-stone-400">แก้ไข</span>
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-stone-800">แก้ไข Supplier Product</h1>
        <p className="text-sm text-stone-500 mt-1">
          {sp.name_th ?? sp.name} ·{" "}
          <span className="text-stone-400">
            Supplier: {sp.supplier.nameTh ?? sp.supplier.name}
          </span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-stone-200 rounded-2xl p-6 space-y-4">
        {/* รูปภาพสินค้า ด้านบนสุด */}
        <SupplierProductImageField
          value={form.imagesText}
          onChange={(v) => setForm((f) => ({ ...f, imagesText: v }))}
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-stone-600">ชื่อ (EN) *</label>
              <button
                type="button"
                disabled={!!aiTarget}
                onClick={() =>
                  suggestField(
                    "sp_name",
                    { name_th: form.name_th },
                    (v) => setForm((f) => ({ ...f, name: v }))
                  )
                }
                className="text-[10px] px-2 py-0.5 rounded-lg border border-violet-200 text-violet-600 hover:bg-violet-50 disabled:opacity-50"
              >
                {aiTarget === "sp_name" ? "…" : "✨ AI"}
              </button>
            </div>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
              placeholder="Product name"
              required
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-stone-600">ชื่อ (TH)</label>
              <button
                type="button"
                disabled={!!aiTarget}
                onClick={() =>
                  suggestField(
                    "sp_name_th",
                    { name: form.name },
                    (v) => setForm((f) => ({ ...f, name_th: v }))
                  )
                }
                className="text-[10px] px-2 py-0.5 rounded-lg border border-violet-200 text-violet-600 hover:bg-violet-50 disabled:opacity-50"
              >
                {aiTarget === "sp_name_th" ? "…" : "✨ AI"}
              </button>
            </div>
            <input
              value={form.name_th}
              onChange={(e) => setForm((f) => ({ ...f, name_th: e.target.value }))}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
              placeholder="ชื่อสินค้า"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-stone-600">คำอธิบาย (EN) *</label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={!!aiTarget}
                  onClick={() =>
                    suggestField(
                      "sp_description",
                      { description_th: form.description_th, name: form.name, name_th: form.name_th },
                      (v) => setForm((f) => ({ ...f, description: v }))
                    )
                  }
                  className="text-[10px] px-2 py-0.5 rounded-lg border border-violet-200 text-violet-600 hover:bg-violet-50 disabled:opacity-50"
                >
                  {aiTarget === "sp_description" ? "…" : "✨ AI"}
                </button>
                <button
                  type="button"
                  onClick={() => setDescPreview((v) => !v)}
                  className="text-[10px] text-stone-400 hover:text-orange-500 transition-colors"
                >
                  {descPreview ? "✏️ แก้ไข" : "👁 HTML"}
                </button>
              </div>
            </div>
            {descPreview ? (
              <div
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm min-h-24 prose prose-sm max-w-none overflow-auto"
                dangerouslySetInnerHTML={{ __html: form.description }}
              />
            ) : (
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={4}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
                required
              />
            )}
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-stone-600">คำอธิบาย (TH)</label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={!!aiTarget}
                  onClick={() =>
                    suggestField(
                      "sp_description_th",
                      { description: form.description, name: form.name, name_th: form.name_th },
                      (v) => setForm((f) => ({ ...f, description_th: v }))
                    )
                  }
                  className="text-[10px] px-2 py-0.5 rounded-lg border border-violet-200 text-violet-600 hover:bg-violet-50 disabled:opacity-50"
                >
                  {aiTarget === "sp_description_th" ? "…" : "✨ AI"}
                </button>
                <button
                  type="button"
                  onClick={() => setDescPreviewTh((v) => !v)}
                  className="text-[10px] text-stone-400 hover:text-orange-500 transition-colors"
                >
                  {descPreviewTh ? "✏️ แก้ไข" : "👁 HTML"}
                </button>
              </div>
            </div>
            {descPreviewTh ? (
              <div
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm min-h-24 prose prose-sm max-w-none overflow-auto"
                dangerouslySetInnerHTML={{ __html: form.description_th }}
              />
            ) : (
              <textarea
                value={form.description_th}
                onChange={(e) => setForm((f) => ({ ...f, description_th: e.target.value }))}
                rows={4}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
              />
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-stone-600 mb-1">คำอธิบายสั้น (EN)</label>
              <button
                type="button"
                disabled={!!aiTarget}
                onClick={() =>
                  suggestField(
                    "sp_shortDescription",
                    { shortDescription_th: form.shortDescription_th, name: form.name, name_th: form.name_th },
                    (v) => setForm((f) => ({ ...f, shortDescription: v }))
                  )
                }
                className="text-[10px] px-2 py-0.5 rounded-lg border border-violet-200 text-violet-600 hover:bg-violet-50 disabled:opacity-50"
              >
                {aiTarget === "sp_shortDescription" ? "…" : "✨ AI"}
              </button>
            </div>
            <textarea
              value={form.shortDescription}
              onChange={(e) => setForm((f) => ({ ...f, shortDescription: e.target.value }))}
              rows={3}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-stone-600 mb-1">คำอธิบายสั้น (TH)</label>
              <button
                type="button"
                disabled={!!aiTarget}
                onClick={() =>
                  suggestField(
                    "sp_shortDescription_th",
                    { shortDescription: form.shortDescription, name: form.name, name_th: form.name_th },
                    (v) => setForm((f) => ({ ...f, shortDescription_th: v }))
                  )
                }
                className="text-[10px] px-2 py-0.5 rounded-lg border border-violet-200 text-violet-600 hover:bg-violet-50 disabled:opacity-50"
              >
                {aiTarget === "sp_shortDescription_th" ? "…" : "✨ AI"}
              </button>
            </div>
            <textarea
              value={form.shortDescription_th}
              onChange={(e) => setForm((f) => ({ ...f, shortDescription_th: e.target.value }))}
              rows={3}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">SKU / รหัส Supplier</label>
            <input
              value={form.supplierSku}
              onChange={(e) => setForm((f) => ({ ...f, supplierSku: e.target.value }))}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">ราคา Supplier (฿)</label>
            <input
              type="number"
              step="0.01"
              value={form.supplierPrice}
              onChange={(e) => setForm((f) => ({ ...f, supplierPrice: e.target.value }))}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-600 mb-1">URL สินค้า Supplier</label>
          <input
            type="url"
            value={form.supplierUrl}
            onChange={(e) => setForm((f) => ({ ...f, supplierUrl: e.target.value }))}
            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
            placeholder="https://..."
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">หมวดหมู่ (optional)</label>
            <input
              value={form.categoryId}
              onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
              placeholder="ใส่ categoryId ตรง ๆ หรือปล่อยว่าง"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">สถานะ (Validation)</label>
            <select
              value={form.validationStatus}
              onChange={(e) =>
                setForm((f) => ({ ...f, validationStatus: e.target.value as ValidationStatus }))
              }
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
            >
              {VALIDATION_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-600 mb-1">Remark</label>
          <textarea
            value={form.remark}
            onChange={(e) => setForm((f) => ({ ...f, remark: e.target.value }))}
            rows={2}
            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 rounded-lg border border-stone-200 text-stone-600 text-sm"
            disabled={saving}
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium disabled:opacity-50"
          >
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </form>
    </div>
  );
}

