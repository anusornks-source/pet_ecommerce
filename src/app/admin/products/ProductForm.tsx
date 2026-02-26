"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import toast from "react-hot-toast";

interface Category {
  id: string;
  name: string;
}

interface ProductFormProps {
  productId?: string;
  initialData?: {
    name: string;
    description: string;
    price: string;
    stock: string;
    images: string;
    categoryId: string;
    petType: string;
    featured: boolean;
  };
}

const petTypes = [
  { value: "", label: "ทุกสัตว์เลี้ยง" },
  { value: "DOG", label: "สุนัข" },
  { value: "CAT", label: "แมว" },
  { value: "BIRD", label: "นก" },
  { value: "FISH", label: "ปลา" },
  { value: "RABBIT", label: "กระต่าย" },
  { value: "OTHER", label: "อื่นๆ" },
];

export default function ProductForm({ productId, initialData }: ProductFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    stock: "",
    images: "",
    categoryId: "",
    petType: "",
    featured: false,
    ...initialData,
  });

  useEffect(() => {
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setCategories(d.data);
      });
  }, []);

  const imageList = form.images.split(",").map((u) => u.trim()).filter(Boolean);

  const uploadFile = async (file: File): Promise<string | null> => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (!data.success) { toast.error(data.error ?? "อัปโหลดไม่สำเร็จ"); return null; }
    return data.url as string;
  };

  const handleFiles = async (files: FileList | File[]) => {
    setUploading(true);
    const newUrls: string[] = [];
    for (const file of Array.from(files)) {
      const url = await uploadFile(file);
      if (url) newUrls.push(url);
    }
    setUploading(false);
    if (newUrls.length > 0) {
      const existing = form.images.trim();
      setForm((f) => ({ ...f, images: existing ? `${existing}, ${newUrls.join(", ")}` : newUrls.join(", ") }));
      toast.success(`อัปโหลดสำเร็จ ${newUrls.length} รูป`);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  };

  const removeImage = (idx: number) => {
    setForm((f) => ({ ...f, images: imageList.filter((_, i) => i !== idx).join(", ") }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      ...form,
      price: parseFloat(form.price),
      stock: parseInt(form.stock),
      images: imageList,
      petType: form.petType || null,
    };

    const url = productId
      ? `/api/admin/products/${productId}`
      : "/api/admin/products";
    const method = productId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (data.success) {
      toast.success(productId ? "บันทึกแล้ว" : "เพิ่มสินค้าแล้ว");
      router.push("/admin/products");
    } else {
      toast.error(data.error || "เกิดข้อผิดพลาด");
    }
    setSaving(false);
  };

  const field = (
    label: string,
    key: keyof typeof form,
    props: React.InputHTMLAttributes<HTMLInputElement> = {}
  ) => (
    <div>
      <label className="block text-sm font-medium text-stone-700 mb-1.5">
        {label}
      </label>
      <input
        {...props}
        value={form[key] as string}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
      />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {field("ชื่อสินค้า", "name", { required: true, placeholder: "เช่น สายจูงหนังแท้" })}

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1.5">
          คำอธิบาย
        </label>
        <textarea
          required
          rows={3}
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="คำอธิบายสินค้า..."
          className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {field("ราคา (บาท)", "price", { required: true, type: "number", min: "0", step: "0.01", placeholder: "0.00" })}
        {field("จำนวนสต็อก", "stock", { required: true, type: "number", min: "0", placeholder: "0" })}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">
            หมวดหมู่
          </label>
          <select
            required
            value={form.categoryId}
            onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
            className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white"
          >
            <option value="">เลือกหมวดหมู่</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">
            ประเภทสัตว์เลี้ยง
          </label>
          <select
            value={form.petType}
            onChange={(e) => setForm((f) => ({ ...f, petType: e.target.value }))}
            className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white"
          >
            {petTypes.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Image Upload */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1.5">รูปภาพสินค้า</label>

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
            dragOver ? "border-orange-400 bg-orange-50" : "border-stone-200 hover:border-orange-300 hover:bg-stone-50"
          }`}
        >
          <input
            ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-orange-500">กำลังอัปโหลด...</p>
            </div>
          ) : (
            <>
              <p className="text-2xl mb-1">🖼️</p>
              <p className="text-sm font-medium text-stone-600">คลิกหรือลากไฟล์มาวางที่นี่</p>
              <p className="text-xs text-stone-400 mt-0.5">JPG, PNG, WebP — ไม่เกิน 5MB ต่อไฟล์</p>
            </>
          )}
        </div>

        {/* Previews with remove button */}
        {imageList.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {imageList.map((url, i) => {
              const isValid = (() => { try { new URL(url); return true; } catch { return false; } })();
              return (
                <div key={i} className="relative group">
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-stone-100 border border-stone-200">
                    {isValid ? (
                      <Image src={url} alt="" fill className="object-cover" sizes="80px" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-stone-400 text-center px-1">
                        URL ไม่ถูกต้อง
                      </div>
                    )}
                  </div>
                  <button type="button" onClick={() => removeImage(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >✕</button>
                </div>
              );
            })}
          </div>
        )}

        {/* Manual URL fallback */}
        <div className="mt-2">
          <p className="text-xs text-stone-400 mb-1">หรือใส่ URL โดยตรง (คั่นด้วยคอมมา)</p>
          <textarea rows={2} value={form.images}
            onChange={(e) => setForm((f) => ({ ...f, images: e.target.value }))}
            placeholder="https://example.com/img1.jpg, https://example.com/img2.jpg"
            className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 resize-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="featured"
          checked={form.featured}
          onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
          className="w-4 h-4 accent-orange-500"
        />
        <label htmlFor="featured" className="text-sm font-medium text-stone-700">
          สินค้าแนะนำ ⭐
        </label>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving || uploading}
          className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-60"
        >
          {saving ? "กำลังบันทึก..." : productId ? "บันทึกการแก้ไข" : "เพิ่มสินค้า"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2.5 rounded-xl text-sm font-medium border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors"
        >
          ยกเลิก
        </button>
      </div>
    </form>
  );
}
