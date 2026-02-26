"use client";

import { useEffect, useState } from "react";
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);

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

  const previewImages = form.images
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      ...form,
      price: parseFloat(form.price),
      stock: parseInt(form.stock),
      images: form.images
        .split(",")
        .map((u) => u.trim())
        .filter(Boolean),
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

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1.5">
          URL รูปภาพ
          <span className="text-stone-400 font-normal ml-1">(คั่นด้วยเครื่องหมายคอมมา)</span>
        </label>
        <textarea
          rows={2}
          value={form.images}
          onChange={(e) => setForm((f) => ({ ...f, images: e.target.value }))}
          placeholder="https://example.com/img1.jpg, https://example.com/img2.jpg"
          className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 resize-none"
        />
        {previewImages.length > 0 && (
          <div className="flex gap-2 mt-2 flex-wrap">
            {previewImages.map((url, i) => (
              <div
                key={i}
                className="relative w-16 h-16 rounded-lg overflow-hidden bg-stone-100 border border-stone-200"
              >
                <Image
                  src={url}
                  alt={`preview ${i + 1}`}
                  fill
                  className="object-cover"
                  onError={() => {}}
                />
              </div>
            ))}
          </div>
        )}
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
          disabled={saving}
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
