"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import toast from "react-hot-toast";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ProductValidationStatus } from "@/generated/prisma/enums";

function SortableImageThumb({
  id,
  url,
  isSelected,
  onSelect,
}: {
  id: number;
  url: string;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      className={`relative w-14 h-14 rounded-lg overflow-hidden shrink-0 border-2 transition-all cursor-grab active:cursor-grabbing ${
        isSelected ? "border-orange-500 ring-1 ring-orange-200" : "border-stone-200 hover:border-stone-300"
      }`}
      title="ลากเพื่อจัดลำดับ"
    >
      <Image src={url} alt="" fill className="object-cover" sizes="56px" unoptimized />
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  [ProductValidationStatus.Lead]: "bg-stone-100 text-stone-700",
  [ProductValidationStatus.Qualified]: "bg-amber-100 text-amber-700",
  [ProductValidationStatus.Approved]: "bg-green-100 text-green-700",
  [ProductValidationStatus.Rejected]: "bg-red-100 text-red-700",
};

interface SupplierProductDetail {
  id: string;
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
  validationStatus: string;
  isImported: boolean;
  productId: string | null;
  note: string | null;
  createdAt: string;
  supplier: {
    id: string;
    name: string;
    nameTh: string | null;
    imageUrl: string | null;
    tel: string | null;
    email: string | null;
    contact: string | null;
    website: string | null;
  };
  category: { id: string; name: string } | null;
  product: { id: string; name: string; name_th: string | null; images: string[]; price: number } | null;
}

export default function SupplierProductViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [sp, setSp] = useState<SupplierProductDetail | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [reorderingImages, setReorderingImages] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchProduct = () => {
    fetch(`/api/admin/supplier-products/${id}`)
      .then((r) => r.json())
      .then((d) => d.success && setSp(d.data));
  };

  useEffect(() => {
    setSp(null);
    fetchProduct();
  }, [id]);

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [sp?.id]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleImageDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !sp) return;
    const images = sp.images ?? [];
    if (images.length < 2) return;
    const oldIndex = Number(active.id);
    const newIndex = Number(over.id);
    const reordered = arrayMove(images, oldIndex, newIndex);
    setReorderingImages(true);
    try {
      const res = await fetch(`/api/admin/suppliers/${sp.supplier.id}/supplier-products/${sp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: reordered }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("จัดลำดับรูปแล้ว");
        setSp((prev) => prev ? { ...prev, images: reordered } : null);
        setSelectedImageIndex(newIndex);
      } else {
        toast.error(data.error ?? "จัดลำดับไม่สำเร็จ");
      }
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setReorderingImages(false);
    }
  };

  const handleDelete = async () => {
    if (!sp || !confirm("ต้องการลบ Supplier Product นี้?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/suppliers/${sp.supplier.id}/supplier-products/${sp.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("ลบแล้ว");
        router.push(`/admin/suppliers/${sp.supplier.id}`);
      } else {
        toast.error(data.error ?? "ลบไม่สำเร็จ");
      }
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setDeleting(false);
    }
  };

  if (!sp) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-stone-100 rounded w-48" />
          <div className="h-64 bg-stone-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  const images = sp.images ?? [];
  const selectedImage = images[selectedImageIndex];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Breadcrumb & Actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/admin/supplier-products" className="text-stone-400 hover:text-stone-600 text-sm">
            ← รายการ Supplier Products
          </Link>
          <Link
            href={`/admin/suppliers/${sp.supplier.id}`}
            className="text-stone-400 hover:text-stone-600 text-sm"
          >
            แก้ไขที่หน้า Supplier
          </Link>
          <h1 className="text-xl font-bold text-stone-800 truncate max-w-md">
            {sp.name_th ?? sp.name}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {sp.productId && (
            <Link
              href={`/admin/products/${sp.productId}`}
              className="text-sm px-3 py-1.5 rounded-lg border border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
            >
              ✓ ดู Product
            </Link>
          )}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-sm px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
          >
            {deleting ? "กำลังลบ..." : "ลบ"}
          </button>
        </div>
      </div>

      {/* Hero */}
      <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
        <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-80 shrink-0 space-y-3">
            <div className="relative aspect-square rounded-xl overflow-hidden bg-stone-50">
              {selectedImage ? (
                <Image src={selectedImage} alt={sp.name} fill className="object-contain" sizes="320px" unoptimized />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-5xl text-stone-300">📦</div>
              )}
            </div>
            {images.length > 1 && (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleImageDragEnd}
              >
                <SortableContext items={images.map((_, i) => i)} strategy={rectSortingStrategy}>
                  <div className={`flex flex-wrap gap-2 ${reorderingImages ? "opacity-70" : ""}`}>
                    {images.map((url, i) => (
                      <SortableImageThumb
                        key={i}
                        id={i}
                        url={url}
                        isSelected={selectedImageIndex === i}
                        onSelect={() => setSelectedImageIndex(i)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-stone-800">{sp.name_th ?? sp.name}</h2>
            {sp.name_th && sp.name !== sp.name_th && (
              <p className="text-stone-500 text-sm mt-0.5">{sp.name}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-3">
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  STATUS_COLORS[sp.validationStatus] ?? "bg-stone-100 text-stone-700"
                }`}
              >
                {sp.validationStatus}
              </span>
              {sp.category && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-stone-100 text-stone-600">
                  {sp.category.name}
                </span>
              )}
              {sp.isImported && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                  Import แล้ว
                </span>
              )}
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              {sp.supplierPrice != null ? (
                <>
                  <span className="text-xl font-bold text-stone-800">฿{sp.supplierPrice.toLocaleString("th-TH")}</span>
                  <span className="text-sm text-stone-500">ราคา Supplier</span>
                </>
              ) : (
                <span className="text-stone-400">— ยังไม่มีราคา</span>
              )}
            </div>
            <Link
              href={`/admin/suppliers/${sp.supplier.id}`}
              className="mt-4 flex items-center gap-3 p-3 rounded-xl border border-stone-100 hover:border-orange-200 hover:bg-orange-50/50 transition-colors w-fit"
            >
              <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-stone-100 shrink-0">
                {sp.supplier.imageUrl ? (
                  <Image src={sp.supplier.imageUrl} alt="" fill className="object-cover" unoptimized />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-400 text-xl">🏪</div>
                )}
              </div>
              <div>
                <p className="font-medium text-stone-800">{sp.supplier.nameTh ?? sp.supplier.name}</p>
                <p className="text-xs text-stone-500">Supplier</p>
              </div>
            </Link>
            {sp.shortDescription && (
              <p className="text-sm text-stone-600 mt-3 line-clamp-3">{sp.shortDescription}</p>
            )}
          </div>
        </div>
      </div>

      {/* Product Info */}
      <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
        <div className="p-6 border-b border-stone-100">
          <h3 className="font-semibold text-stone-800">ข้อมูลสินค้า</h3>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">ชื่อ (EN)</p>
              <p className="text-stone-800">{sp.name || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">ชื่อ (TH)</p>
              <p className="text-stone-800">{sp.name_th || "—"}</p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">คำอธิบาย (EN)</p>
              <div className="text-stone-700 text-sm prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: sp.description || "—" }} />
            </div>
            <div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">คำอธิบาย (TH)</p>
              <div className="text-stone-700 text-sm prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: sp.description_th || "—" }} />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">คำอธิบายสั้น (EN)</p>
              <p className="text-stone-700 text-sm whitespace-pre-wrap">{sp.shortDescription || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">คำอธิบายสั้น (TH)</p>
              <p className="text-stone-700 text-sm whitespace-pre-wrap">{sp.shortDescription_th || "—"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Supplier & SKU */}
      <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
        <div className="p-6 border-b border-stone-100">
          <h3 className="font-semibold text-stone-800">ข้อมูล Supplier & SKU</h3>
        </div>
        <div className="p-6 grid md:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">SKU / รหัส Supplier</p>
            <p className="text-stone-800 font-mono text-sm">{sp.supplierSku || "—"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">URL สินค้า Supplier</p>
            {sp.supplierUrl ? (
              <a
                href={sp.supplierUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-600 hover:underline text-sm break-all"
              >
                {sp.supplierUrl}
              </a>
            ) : (
              <p className="text-stone-400">—</p>
            )}
          </div>
        </div>
      </div>

      {/* Supplier Contact */}
      {(sp.supplier.tel || sp.supplier.email || sp.supplier.contact || sp.supplier.website) && (
        <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
          <div className="p-6 border-b border-stone-100">
            <h3 className="font-semibold text-stone-800">ข้อมูลติดต่อ Supplier</h3>
          </div>
          <div className="p-6 space-y-2">
            {sp.supplier.tel && (
              <p className="text-sm text-stone-700">📞 {sp.supplier.tel}</p>
            )}
            {sp.supplier.email && (
              <a href={`mailto:${sp.supplier.email}`} className="text-sm text-teal-600 hover:underline block">
                ✉️ {sp.supplier.email}
              </a>
            )}
            {sp.supplier.website && (
              <a
                href={sp.supplier.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-teal-600 hover:underline block"
              >
                🌐 {sp.supplier.website}
              </a>
            )}
            {sp.supplier.contact && (
              <p className="text-sm text-stone-600 whitespace-pre-wrap mt-2">{sp.supplier.contact}</p>
            )}
          </div>
        </div>
      )}

      {/* Remark & Note */}
      {(sp.remark || sp.note) && (
        <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
          <div className="p-6 border-b border-stone-100">
            <h3 className="font-semibold text-stone-800">หมายเหตุ</h3>
          </div>
          <div className="p-6 space-y-4">
            {sp.remark && (
              <div>
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Remark</p>
                <p className="text-stone-700 text-sm whitespace-pre-wrap">{sp.remark}</p>
              </div>
            )}
            {sp.note && (
              <div>
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Note</p>
                <p className="text-stone-700 text-sm whitespace-pre-wrap">{sp.note}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Imported Product */}
      {sp.product && (
        <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
          <div className="p-6 border-b border-stone-100 flex items-center justify-between">
            <h3 className="font-semibold text-stone-800">Product ที่ Import แล้ว</h3>
            <Link
              href={`/admin/products/${sp.product.id}`}
              className="text-sm px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium"
            >
              ไปที่ Product
            </Link>
          </div>
          <div className="p-6 flex items-center gap-4">
            {sp.product.images?.[0] && (
              <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-stone-100 shrink-0">
                <Image src={sp.product.images[0]} alt="" fill className="object-cover" unoptimized />
              </div>
            )}
            <div>
              <p className="font-medium text-stone-800">{sp.product.name_th ?? sp.product.name}</p>
              <p className="text-sm text-stone-500">฿{sp.product.price.toLocaleString("th-TH")}</p>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-stone-400">
        สร้างเมื่อ {new Date(sp.createdAt).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}
      </p>
    </div>
  );
}
