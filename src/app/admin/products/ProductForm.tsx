"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import toast from "react-hot-toast";
import { useShopAdmin } from "@/context/ShopAdminContext";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SUPPLIER_SEARCH_PAGE_SIZE } from "@/lib/constants";
import { ProductValidationStatus } from "@/generated/prisma/enums";

interface CategoryGroupLite {
  id: string;
  name: string;
  name_th?: string | null;
  icon?: string | null;
}

interface Category {
  id: string;
  name: string;
  name_th?: string | null;
  icon?: string | null;
  groupId?: string | null;
  group?: CategoryGroupLite | null;
}

interface PetType {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
}

interface TagOption {
  id: string;
  name: string;
  color: string;
  icon: string | null;
}

const TAG_COLORS: Record<string, string> = {
  orange: "bg-orange-100 text-orange-700 border-orange-200",
  red:    "bg-red-100 text-red-700 border-red-200",
  green:  "bg-green-100 text-green-700 border-green-200",
  blue:   "bg-blue-100 text-blue-700 border-blue-200",
  purple: "bg-purple-100 text-purple-700 border-purple-200",
  yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
};

const FULFILLMENT_LABELS: Record<string, string> = {
  SELF: "ส่งเอง",
  CJ: "CJ Dropship",
  SUPPLIER: "Supplier",
};

function SortableImageThumb({ id, url, onRemove }: { id: number; url: string; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const isValid = (() => { try { new URL(url); return true; } catch { return false; } })();

  return (
    <div ref={setNodeRef} style={style} className="relative group flex flex-col items-center gap-1">
      <div
        {...attributes}
        {...listeners}
        className="relative w-20 h-20 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-orange-300 transition-shadow"
        title="ลากเพื่อจัดลำดับ"
      >
        {isValid ? (
          <Image src={url} alt="" fill className="object-cover" sizes="80px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-stone-400 text-center px-1">
            URL ไม่ถูกต้อง
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="w-6 h-6 rounded bg-red-100 hover:bg-red-200 text-red-600 text-xs flex items-center justify-center"
        title="ลบ"
      >
        ✕
      </button>
    </div>
  );
}

interface VariantRow {
  id?: string;
  size: string;
  color: string;
  price: string;
  stock: string;
  sku: string;
  cjVid: string;
  cjStock?: number | null;
  variantImage: string;
  attributes?: { name: string; value: string }[] | null;
  active: boolean;
  fulfillmentMethod?: string | null;
}

interface ProductFormProps {
  productId?: string;
  /** shopId of the product being edited — used to fetch correct categories */
  productShopId?: string;
  initialData?: {
    name: string;
    name_th?: string;
    description: string;
    description_th?: string;
    shortDescription?: string;
    shortDescription_th?: string;
    sourceDescription?: string;
    price: string;
    normalPrice?: string;
    stock: string;
    images: string;
    categoryId: string;
    petTypeId: string;
    active: boolean;
    featured: boolean;
    validationStatus?: string;
    deliveryDays?: string;
    warehouseCountry?: string;
    fulfillmentMethod?: string;
    variants?: VariantRow[];
    tagIds?: string[];
  };
}

export default function ProductForm({ productId, productShopId, initialData }: ProductFormProps) {
  const router = useRouter();
  const { activeShop, shops } = useShopAdmin();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [petTypes, setPetTypes] = useState<PetType[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [generatingDesc, setGeneratingDesc] = useState<"en" | "th" | false>(false);
  const [generatingName, setGeneratingName] = useState<"en" | "th" | false>(false);
  const [generatingFullDesc, setGeneratingFullDesc] = useState<"en" | "th" | false>(false);

  const [form, setForm] = useState({
    name: "",
    name_th: "",
    description: "",
    description_th: "",
    shortDescription: "",
    shortDescription_th: "",
    sourceDescription: "",
    price: "",
    normalPrice: "",
    stock: "",
    images: "",
    categoryId: "",
    petTypeId: "",
    active: true,
    featured: false,
    validationStatus: ProductValidationStatus.Approved,
    deliveryDays: "2",
    warehouseCountry: "",
    fulfillmentMethod: "SELF",
    ...initialData,
  });
  const [showSourceDesc, setShowSourceDesc] = useState(false); // always collapsed by default

  const [descPreview, setDescPreview] = useState(!!(initialData?.description?.trim()));
  const [descPreviewTh, setDescPreviewTh] = useState(!!(initialData?.description_th?.trim()));
  const [variants, setVariants] = useState<VariantRow[]>(initialData?.variants ?? []);
  const [stockRange, setStockRange] = useState({ min: 50, max: 100 });
  const [allTags, setAllTags] = useState<TagOption[]>([]);
  const [tagIds, setTagIds] = useState<string[]>(initialData?.tagIds ?? []);

  type SupplierOption = { id: string; name: string; nameTh: string | null; imageUrl: string | null };
  const [supplierSearch, setSupplierSearch] = useState("");
  const [supplierPage, setSupplierPage] = useState(1);
  const [supplierTotal, setSupplierTotal] = useState(0);
  const [supplierResults, setSupplierResults] = useState<SupplierOption[]>([]);
  const [supplierLoading, setSupplierLoading] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierOption | null>(null);
  const [supplierPrice, setSupplierPrice] = useState("");
  const supplierSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const emptyVariant = (): VariantRow => {
    const stock = Math.floor(Math.random() * (stockRange.max - stockRange.min + 1)) + stockRange.min;
    return { size: "", color: "", price: "", stock: String(stock), sku: "", cjVid: "", variantImage: "", active: true };
  };
  const addVariant = () => setVariants((v) => [...v, emptyVariant()]);
  const removeVariant = (idx: number) => setVariants((v) => v.filter((_, i) => i !== idx));
  const updateVariant = (idx: number, key: keyof VariantRow, value: string | boolean) =>
    setVariants((v) => v.map((row, i) => (i === idx ? { ...row, [key]: value } : row)));

  // Use product's own shopId when editing, fallback to activeShop for new products
  const effectiveShopId = productShopId || activeShop?.id;
  const effectiveShop = shops.find((s) => s.id === effectiveShopId) ?? activeShop;

  useEffect(() => {
    if (!effectiveShopId) return;

    // Fetch shop-scoped categories (only enabled ones for this shop)
    fetch(`/api/admin/shops/${effectiveShopId}/categories`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const enabled = (d.data as Category[]).filter((c: any) => (c as any).enabled);
          setCategories(enabled);
        }
      });

    if (effectiveShop?.usePetType) {
      fetch("/api/admin/pet-types")
        .then((r) => r.json())
        .then((d) => { if (d.success) setPetTypes(d.data); });
    } else {
      setPetTypes([]);
    }

    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setStockRange({
            min: d.data.displayStockMin ?? 50,
            max: d.data.displayStockMax ?? 100,
          });
        }
      });

    fetch("/api/admin/tags")
      .then((r) => r.json())
      .then((d) => { if (d.success) setAllTags(d.data); });
  }, [effectiveShopId, effectiveShop]);

  useEffect(() => {
    if (supplierSearchRef.current) clearTimeout(supplierSearchRef.current);
    supplierSearchRef.current = setTimeout(() => {
      setSupplierLoading(true);
      const q = new URLSearchParams({ minimal: "true", limit: String(SUPPLIER_SEARCH_PAGE_SIZE), page: String(supplierPage) });
      if (supplierSearch.trim()) q.set("search", supplierSearch.trim());
      fetch(`/api/admin/suppliers?${q}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.success) {
            setSupplierResults(d.data ?? []);
            setSupplierTotal(d.total ?? 0);
          }
        })
        .finally(() => setSupplierLoading(false));
    }, 300);
    return () => { if (supplierSearchRef.current) clearTimeout(supplierSearchRef.current); };
  }, [supplierSearch, supplierPage]);

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

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleImageDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = Number(active.id);
    const newIndex = Number(over.id);
    const reordered = arrayMove(imageList, oldIndex, newIndex);
    setForm((f) => ({ ...f, images: reordered.join(", ") }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      ...form,
      price: parseFloat(form.price),
      normalPrice: form.normalPrice ? parseFloat(form.normalPrice) : null,
      stock: parseInt(form.stock),
      images: imageList,
      petTypeId: form.petTypeId || null,
      deliveryDays: parseInt(form.deliveryDays) || 2,
      warehouseCountry: form.warehouseCountry || null,
      variants,
      tagIds,
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
      const newProductId = productId ? undefined : (data.data?.id as string | undefined);
      if (newProductId && selectedSupplier) {
        const priceVal = supplierPrice.trim() ? parseFloat(supplierPrice) : null;
        const linkRes = await fetch(`/api/admin/suppliers/${selectedSupplier.id}/products`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: newProductId, supplierPrice: priceVal }),
        });
        const linkData = await linkRes.json();
        if (!linkData.success) {
          toast.error(linkData.error || "ผูก Supplier ไม่สำเร็จ");
        }
      }
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
      {/* Image Upload — moved to top above product names */}
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

        {/* Previews with drag reorder + remove */}
        {imageList.length > 0 && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleImageDragEnd}>
            <SortableContext items={imageList.map((_, i) => i)} strategy={horizontalListSortingStrategy}>
              <div className="flex flex-wrap gap-2 mt-3">
                {imageList.map((url, i) => (
                  <SortableImageThumb
                    key={i}
                    id={i}
                    url={url}
                    onRemove={() => removeImage(i)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
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

      {/* Product names */}
      <div className="grid grid-cols-2 gap-4">
        {/* ชื่อสินค้า EN — with AI helper */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-stone-700">ชื่อสินค้า (EN)</label>
            <button
              type="button"
              disabled={!!generatingName || !form.name_th}
              onClick={async () => {
                if (!form.name_th) {
                  toast.error("กรุณากรอกชื่อสินค้า (TH) ก่อน");
                  return;
                }
                setGeneratingName("en");
                try {
                  const res = await fetch("/api/admin/ai/suggest-field", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      field: "name_en",
                      name_th: form.name_th,
                    }),
                  });
                  const data = await res.json();
                  if (data.success && data.value) {
                    setForm((f) => ({ ...f, name: data.value }));
                  } else {
                    toast.error(data.error || "AI generation failed");
                  }
                } catch {
                  toast.error("Error");
                } finally {
                  setGeneratingName(false);
                }
              }}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 transition-colors disabled:opacity-50 shrink-0"
            >
              {generatingName === "en" ? (
                <>
                  <span className="inline-block w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /> EN...
                </>
              ) : (
                <>✨ AI EN</>
              )}
            </button>
          </div>
          <input
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Genuine Leather Dog Leash"
            className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
          />
        </div>
        {/* ชื่อสินค้า TH — with AI translate button */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-stone-700">ชื่อสินค้า (TH)</label>
            <button
              type="button"
              disabled={!!generatingName || !form.name}
              onClick={async () => {
                setGeneratingName("th");
                try {
                  const res = await fetch("/api/admin/ai/suggest-field", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ field: "name_th", name: form.name }),
                  });
                  const data = await res.json();
                  if (data.success) setForm((f) => ({ ...f, name_th: data.value }));
                  else toast.error(data.error || "AI generation failed");
                } catch { toast.error("Error"); } finally { setGeneratingName(false); }
              }}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-600 border border-violet-200 transition-colors disabled:opacity-50 shrink-0"
            >
              {generatingName === "th" ? <><span className="inline-block w-3 h-3 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" /> TH...</> : <>✨ AI TH</>}
            </button>
          </div>
          <input
            value={form.name_th}
            onChange={(e) => setForm((f) => ({ ...f, name_th: e.target.value }))}
            placeholder="เช่น สายจูงหนังแท้"
            className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
          />
        </div>
      </div>

      {/* Source Description — paste raw content for AI/reference */}
      <div className="border border-stone-200 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowSourceDesc((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-stone-50 hover:bg-stone-100 transition-colors text-sm text-stone-600"
        >
          <span className="font-medium">
            📄 Source Description
            <span className="ml-1.5 text-xs font-normal text-stone-400">(แปะ content ต้นฉบับ — ใช้เป็นแหล่งข้อมูลให้ AI)</span>
          </span>
          <span className="text-stone-400 text-xs">{showSourceDesc ? "ซ่อน ▲" : (form.sourceDescription ? "มีข้อมูล ▼" : "เพิ่ม ▼")}</span>
        </button>
        {showSourceDesc && (
          <textarea
            rows={6}
            value={form.sourceDescription}
            onChange={(e) => setForm((f) => ({ ...f, sourceDescription: e.target.value }))}
            placeholder="วางรายละเอียดสินค้าต้นฉบับที่นี่ (ภาษาอังกฤษ, HTML, หรือข้อความใดก็ได้) — AI จะใช้เป็นข้อมูลในการสร้าง short description"
            className="w-full px-4 py-3 text-sm text-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-200 resize-none border-t border-stone-200"
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Short Description EN */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-stone-700">
              คำอธิบายสั้น (EN)
              <span className="ml-1.5 text-xs font-normal text-stone-400">(product card)</span>
            </label>
            <button
              type="button"
              disabled={!!generatingDesc}
              onClick={async () => {
                setGeneratingDesc("en");
                try {
                  const res = await fetch("/api/admin/ai/generate-short-desc", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: form.name, description: form.sourceDescription || form.description, lang: "en" }),
                  });
                  const data = await res.json();
                  if (data.success) setForm((f) => ({ ...f, shortDescription: data.shortDescription }));
                  else toast.error(data.error || "AI generation failed");
                } catch { toast.error("Error"); } finally { setGeneratingDesc(false); }
              }}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 transition-colors disabled:opacity-50 shrink-0"
            >
              {generatingDesc === "en" ? <><span className="inline-block w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /> EN...</> : <>✨ AI EN</>}
            </button>
          </div>
          <textarea rows={4} value={form.shortDescription}
            onChange={(e) => setForm((f) => ({ ...f, shortDescription: e.target.value }))}
            placeholder="e.g. Genuine leather leash, adjustable size..."
            className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 resize-none"
          />
        </div>
        {/* Short Description TH */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-stone-700">
              คำอธิบายสั้น (TH)
              <span className="ml-1.5 text-xs font-normal text-stone-400">(product card)</span>
            </label>
            <button
              type="button"
              disabled={!!generatingDesc}
              onClick={async () => {
                setGeneratingDesc("th");
                try {
                  const res = await fetch("/api/admin/ai/generate-short-desc", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: form.name_th || form.name, description: form.sourceDescription || form.description_th || form.description, lang: "th" }),
                  });
                  const data = await res.json();
                  if (data.success) setForm((f) => ({ ...f, shortDescription_th: data.shortDescription }));
                  else toast.error(data.error || "AI generation ไม่สำเร็จ");
                } catch { toast.error("เกิดข้อผิดพลาด"); } finally { setGeneratingDesc(false); }
              }}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-600 border border-violet-200 transition-colors disabled:opacity-50 shrink-0"
            >
              {generatingDesc === "th" ? <><span className="inline-block w-3 h-3 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" /> TH...</> : <>✨ AI TH</>}
            </button>
          </div>
          <textarea rows={4} value={form.shortDescription_th}
            onChange={(e) => setForm((f) => ({ ...f, shortDescription_th: e.target.value }))}
            placeholder="เช่น สายจูงหนังแท้นุ่มมือ ปรับขนาดได้..."
            className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 resize-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Full Description EN */}
        <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-sm font-medium text-stone-700">คำอธิบายเต็ม (EN)</label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!!generatingFullDesc}
              onClick={async () => {
                setGeneratingFullDesc("en");
                try {
                  const res = await fetch("/api/admin/ai/generate-desc", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      name: form.name,
                      description: form.sourceDescription || form.description,
                      lang: "en",
                    }),
                  });
                  const data = await res.json();
                  if (data.success) {
                    setForm((f) => ({ ...f, description: data.description }));
                  } else {
                    toast.error(data.error || "AI generation failed");
                  }
                } catch {
                  toast.error("Error");
                } finally {
                  setGeneratingFullDesc(false);
                }
              }}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 transition-colors disabled:opacity-50 shrink-0"
            >
              {generatingFullDesc === "en" ? <><span className="inline-block w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /> EN...</> : <>✨ AI EN</>}
            </button>
            <button type="button" onClick={() => setDescPreview((v) => !v)}
              className="text-xs text-stone-400 hover:text-orange-500 transition-colors">
              {descPreview ? "✏️ แก้ไข" : "👁 HTML"}
            </button>
          </div>
        </div>
        {descPreview ? (
          <div
            className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm min-h-40 prose prose-sm desc-html max-w-none overflow-auto"
            dangerouslySetInnerHTML={{ __html: form.description }}
          />
        ) : (
          <textarea
            required
            rows={8}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Product description (HTML supported)..."
            className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 resize-none"
          />
        )}
        </div>

        {/* Full Description TH */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-stone-700">คำอธิบายเต็ม (TH)</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!!generatingFullDesc}
                onClick={async () => {
                  setGeneratingFullDesc("th");
                  try {
                    const res = await fetch("/api/admin/ai/generate-desc", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ name: form.name_th || form.name, description: form.sourceDescription || form.description_th || form.description, lang: "th" }),
                    });
                    const data = await res.json();
                    if (data.success) setForm((f) => ({ ...f, description_th: data.description }));
                    else toast.error(data.error || "AI generation ไม่สำเร็จ");
                  } catch { toast.error("เกิดข้อผิดพลาด"); } finally { setGeneratingFullDesc(false); }
                }}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-600 border border-violet-200 transition-colors disabled:opacity-50 shrink-0"
              >
                {generatingFullDesc === "th" ? <><span className="inline-block w-3 h-3 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" /> TH...</> : <>✨ AI TH</>}
              </button>
              <button type="button" onClick={() => setDescPreviewTh((v) => !v)}
                className="text-xs text-stone-400 hover:text-orange-500 transition-colors">
                {descPreviewTh ? "✏️ แก้ไข" : "👁 HTML"}
              </button>
            </div>
          </div>
          {descPreviewTh ? (
            <div
              className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm min-h-40 prose prose-sm desc-html max-w-none overflow-auto"
              dangerouslySetInnerHTML={{ __html: form.description_th }}
            />
          ) : (
            <textarea
              rows={8}
              value={form.description_th}
              onChange={(e) => setForm((f) => ({ ...f, description_th: e.target.value }))}
              placeholder="คำอธิบายสินค้าภาษาไทย (รองรับ HTML)..."
              className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 resize-none"
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {field("ราคา (บาท)", "price", { required: true, type: "number", min: "0", step: "0.01", placeholder: "0.00" })}
        {field("ราคาเดิม / ก่อนลด (บาท)", "normalPrice", { type: "number", min: "0", step: "0.01", placeholder: "เว้นว่าง = ไม่แสดงส่วนลด" })}
        {field("จำนวนสต็อก", "stock", { required: true, type: "number", min: "0", placeholder: "0" })}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {field("ระยะเวลาจัดส่ง (วัน)", "deliveryDays", { type: "number", min: "1", placeholder: "2" })}
        {field("คลังสินค้า (admin)", "warehouseCountry", { placeholder: "CN, US, ฯลฯ" })}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">วิธีจัดส่ง</label>
          <select
            value={form.fulfillmentMethod}
            onChange={(e) => setForm((f) => ({ ...f, fulfillmentMethod: e.target.value }))}
            className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white"
          >
            <option value="SELF">ส่งเอง</option>
            <option value="CJ">CJ Dropship</option>
            <option value="SUPPLIER">Supplier</option>
          </select>
        </div>
      </div>

      {!productId && (
        <div className="border border-stone-200 rounded-xl p-4 bg-stone-50/50">
          <label className="block text-sm font-medium text-stone-700 mb-2">Supplier (ถ้ามี)</label>
          <p className="text-xs text-stone-500 mb-3">ค้นหาและเลือก supplier แล้วใส่ราคาขาย supplier ได้</p>
          <div className="flex gap-2 mb-3">
            <input
              type="search"
              value={supplierSearch}
              onChange={(e) => { setSupplierSearch(e.target.value); setSupplierPage(1); }}
              placeholder="ค้นหาชื่อ supplier..."
              className="flex-1 border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
            />
          </div>
          {selectedSupplier ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-white border border-stone-200 mb-3">
              {selectedSupplier.imageUrl ? (
                <img src={selectedSupplier.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-stone-200" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-stone-200 flex items-center justify-center text-stone-500 text-lg">🏪</div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-stone-800">{selectedSupplier.nameTh || selectedSupplier.name}</p>
                <p className="text-xs text-stone-500">ID: {selectedSupplier.id}</p>
                <p className="text-xs text-stone-500">ราคาขาย supplier (บาท)</p>
              </div>
              <input
                type="number"
                min="0"
                step="0.01"
                value={supplierPrice}
                onChange={(e) => setSupplierPrice(e.target.value)}
                placeholder="0"
                className="w-28 border border-stone-200 rounded-lg px-2 py-1.5 text-sm"
              />
              <button type="button" onClick={() => { setSelectedSupplier(null); setSupplierPrice(""); }} className="text-xs text-red-600 hover:underline">
                ยกเลิก
              </button>
            </div>
          ) : (
            <>
              <div className="max-h-48 overflow-y-auto border border-stone-200 rounded-lg bg-white divide-y divide-stone-100">
                {supplierLoading && <div className="p-3 text-sm text-stone-400">กำลังโหลด...</div>}
                {!supplierLoading && supplierResults.length === 0 && <div className="p-3 text-sm text-stone-400">พิมพ์ค้นหาหรือไม่มีรายการ</div>}
                {!supplierLoading && supplierResults.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSupplier(s)}
                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-stone-50 transition-colors"
                  >
                    {s.imageUrl ? (
                      <img src={s.imageUrl} alt="" className="w-9 h-9 rounded-lg object-cover border border-stone-200 shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-stone-200 flex items-center justify-center text-stone-500 shrink-0">🏪</div>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="font-medium text-stone-800 truncate block">{s.nameTh || s.name}</span>
                      <span className="text-xs text-stone-500">ID: {s.id}</span>
                    </span>
                  </button>
                ))}
              </div>
              {supplierTotal > SUPPLIER_SEARCH_PAGE_SIZE && (
                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    disabled={supplierPage <= 1}
                    onClick={() => setSupplierPage((p) => Math.max(1, p - 1))}
                    className="text-xs px-2 py-1 rounded border border-stone-200 disabled:opacity-40"
                  >
                    ← ก่อน
                  </button>
                  <span className="text-xs text-stone-500">หน้า {supplierPage} / {Math.ceil(supplierTotal / SUPPLIER_SEARCH_PAGE_SIZE)}</span>
                  <button
                    type="button"
                    disabled={supplierPage >= Math.ceil(supplierTotal / SUPPLIER_SEARCH_PAGE_SIZE)}
                    onClick={() => setSupplierPage((p) => p + 1)}
                    className="text-xs px-2 py-1 rounded border border-stone-200 disabled:opacity-40"
                  >
                    ถัดไป →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div className={`grid gap-4 ${effectiveShop?.usePetType !== false ? "grid-cols-2" : "grid-cols-1"}`}>
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
            {(() => {
              if (categories.length === 0) return null;
              const groupsMap = new Map<string | null, { group: CategoryGroupLite | null; cats: Category[] }>();
              categories.forEach((c) => {
                const key = c.group?.id ?? null;
                const existing = groupsMap.get(key) ?? { group: c.group ?? null, cats: [] };
                existing.cats.push(c);
                groupsMap.set(key, existing);
              });
              const grouped = Array.from(groupsMap.values());
              return grouped.map(({ group, cats }) =>
                group ? (
                  <optgroup
                    key={group.id}
                    label={`${group.icon ?? "🗂️"} ${group.name_th ?? group.name}`}
                  >
                    {cats.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </option>
                    ))}
                  </optgroup>
                ) : (
                  <optgroup key="__ungrouped" label="อื่น ๆ / ไม่มีกลุ่ม">
                    {cats.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </option>
                    ))}
                  </optgroup>
                )
              );
            })()}
          </select>
        </div>
        {effectiveShop?.usePetType !== false && (
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              ประเภทสัตว์เลี้ยง
            </label>
            <select
              value={form.petTypeId}
              onChange={(e) => setForm((f) => ({ ...f, petTypeId: e.target.value }))}
              className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white"
            >
              <option value="">ทุกสัตว์เลี้ยง</option>
              {petTypes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.icon} {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Variants */}
      <div className="border border-stone-200 rounded-xl p-4 bg-stone-50/50">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-stone-700">
            Variants (ขนาด / สี) — <span className="text-stone-400 font-normal">ถ้าไม่มี variants ราคา/สต็อกจะใช้จากด้านบน</span>
          </label>
          <button
            type="button"
            onClick={addVariant}
            className="text-xs text-orange-500 border border-orange-300 rounded-lg px-2.5 py-1 hover:bg-orange-50 transition-colors"
          >
            + เพิ่ม Variant
          </button>
        </div>

        {variants.length > 0 && (
          <div className="space-y-3">
            {/* Header */}
            <div className="grid grid-cols-[80px_80px_90px_70px_120px_140px_60px_90px_44px_52px] gap-2 text-xs text-stone-400 px-1">
              <span>ขนาด</span><span>สี</span><span>ราคา (฿)</span><span>สต็อก</span><span>SKU</span><span>CJ VID</span><span>CJ Stock</span><span>ส่ง</span><span>แสดง</span><span className="pl-4">ลบ</span>
            </div>
            {variants.map((v, idx) => {
              const isValidImg = (() => { try { new URL(v.variantImage ?? ""); return true; } catch { return false; } })();
              return (
                <div key={idx} className={`space-y-1.5 ${!v.active ? "opacity-50" : ""}`}>
                  {/* Main row */}
                  <div className="grid grid-cols-[80px_80px_90px_70px_120px_140px_60px_90px_44px_52px] gap-2 items-center">
                    <input className="border border-stone-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-200"
                      placeholder="S/M/L" value={v.size} onChange={(e) => updateVariant(idx, "size", e.target.value)} />
                    <input className="border border-stone-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-200"
                      placeholder="สี" value={v.color} onChange={(e) => updateVariant(idx, "color", e.target.value)} />
                    <input type="number" min="0" step="0.01" className="border border-stone-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-200"
                      placeholder="0.00" value={v.price} onChange={(e) => updateVariant(idx, "price", e.target.value)} />
                    <input type="number" min="0" className="border border-stone-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-200"
                      placeholder="0" value={v.stock} onChange={(e) => updateVariant(idx, "stock", e.target.value)} />
                    <input className="border border-stone-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-200"
                      placeholder="SKU-001" value={v.sku} onChange={(e) => updateVariant(idx, "sku", e.target.value)} />
                    <input className="border border-stone-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-200"
                      placeholder="CJ VID" value={v.cjVid} onChange={(e) => updateVariant(idx, "cjVid", e.target.value)} />
                    <div className="text-xs text-center text-stone-400 tabular-nums">
                      {v.cjStock != null ? v.cjStock.toLocaleString() : "—"}
                    </div>
                    <select
                      value={v.fulfillmentMethod ?? ""}
                      onChange={(e) => updateVariant(idx, "fulfillmentMethod", e.target.value || null as unknown as string)}
                      className="border border-stone-200 rounded-lg px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-200 bg-white w-full"
                      title="วิธีจัดส่ง variant นี้"
                    >
                      <option value="">ตาม Product ({FULFILLMENT_LABELS[form.fulfillmentMethod] ?? form.fulfillmentMethod})</option>
                      <option value="SELF">ส่งเอง</option>
                      <option value="CJ">CJ</option>
                      <option value="SUPPLIER">Supplier</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setVariants((vs) => vs.map((row, i) => i === idx ? { ...row, active: !row.active } : row))}
                      className={`w-10 h-7 rounded-full transition-colors shrink-0 relative ${v.active ? "bg-green-400" : "bg-stone-200"}`}
                      title={v.active ? "แสดงอยู่" : "ซ่อนอยู่"}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${v.active ? "translate-x-3.5" : "translate-x-0"}`} />
                    </button>
                    <button type="button" onClick={() => removeVariant(idx)}
                      className="w-7 h-7 ml-4 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 flex items-center justify-center text-xs transition-colors">
                      ✕
                    </button>
                  </div>

                  {/* Variant image row */}
                  <div className="flex items-center gap-2 pl-1">
                    {isValidImg && (
                      <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-stone-200 shrink-0">
                        <Image src={v.variantImage!} alt="" fill className="object-cover" sizes="32px" />
                      </div>
                    )}
                    <input
                      className="flex-1 border border-stone-200 rounded-lg px-2 py-1 text-xs text-stone-500 focus:outline-none focus:ring-1 focus:ring-orange-200 placeholder:text-stone-300"
                      placeholder="🖼️ URL รูปภาพ variant (ถ้ามี)"
                      value={v.variantImage ?? ""}
                      onChange={(e) => updateVariant(idx, "variantImage", e.target.value)}
                    />
                  </div>

                  {/* Attributes tags (read-only, from CJ) */}
                  {v.attributes && v.attributes.length > 0 && (
                    <div className="flex flex-wrap gap-1 pl-1">
                      {v.attributes.map((attr, ai) => (
                        <span key={ai} className="text-[10px] bg-blue-50 text-blue-500 border border-blue-100 px-2 py-0.5 rounded-full">
                          {attr.name}: {attr.value}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="border border-stone-200 rounded-xl p-4 bg-stone-50/50 flex items-center gap-6">
          {/* Validation status — ไม่ใช่ Approved จะไม่แสดงบนร้านและขายไม่ได้ */}
          <div className="flex items-center gap-2">
            <label htmlFor="validationStatus" className="text-sm font-medium text-stone-700 whitespace-nowrap">
              สถานะการอนุมัติ
            </label>
            <select
              id="validationStatus"
              value={form.validationStatus ?? ProductValidationStatus.Approved}
              onChange={(e) => setForm((f) => ({ ...f, validationStatus: e.target.value as ProductValidationStatus }))}
              className="border border-stone-200 rounded-lg px-2 py-1.5 text-sm"
            >
              <option value={ProductValidationStatus.Lead}>Lead</option>
              <option value={ProductValidationStatus.Qualified}>Qualified</option>
              <option value={ProductValidationStatus.Approved}>Approved</option>
              <option value={ProductValidationStatus.Rejected}>Rejected</option>
            </select>
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, active: !f.active }))}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-200 focus:ring-offset-2 ${form.active ? "bg-green-400" : "bg-stone-300"}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-200 ${form.active ? "left-[22px]" : "left-0.5"}`}
              />
            </button>
            <span className={`text-sm font-medium shrink-0 ${form.active ? "text-green-600" : "text-stone-400"}`}>
              {form.active ? "แสดงในร้าน (Active)" : "ซ่อนจากร้าน (Inactive)"}
            </span>
          </div>
        </div>

        {/* Featured */}
        <div className="border border-stone-200 rounded-xl p-4 bg-stone-50/50 flex items-center gap-2">
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
      </div>

      {/* Tags */}
      {allTags.length > 0 && (
        <div className="border border-stone-200 rounded-xl p-4 bg-stone-50/50">
          <label className="block text-sm font-medium text-stone-700 mb-2">🔖 Tags / Badge</label>
          <div className="flex flex-wrap gap-2">
            {allTags.map((tag) => {
              const selected = tagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() =>
                    setTagIds((prev) =>
                      selected ? prev.filter((id) => id !== tag.id) : [...prev, tag.id]
                    )
                  }
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    selected
                      ? (TAG_COLORS[tag.color] ?? TAG_COLORS.orange) + " scale-105 shadow-sm"
                      : "bg-stone-50 text-stone-400 border-stone-200 hover:border-stone-300"
                  }`}
                >
                  {tag.icon && <span>{tag.icon}</span>}
                  {tag.name}
                  {selected && <span className="ml-0.5">✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

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
