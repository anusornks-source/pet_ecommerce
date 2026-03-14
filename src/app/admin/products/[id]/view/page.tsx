"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import Image from "next/image";
import MarketingAssetsSection from "@/components/admin/MarketingAssetsSection";
import { useLocale } from "@/context/LocaleContext";
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

interface ProductVariant {
  id: string;
  size: string | null;
  color: string | null;
  price: number;
  stock: number;
  cjStock?: number | null;
  sku: string | null;
  cjVid?: string | null;
  variantImage: string | null;
  attributes?: { name: string; value: string }[] | null;
  active: boolean;
  fulfillmentMethod?: string | null;
  createdAt?: string;
}

interface Category {
  id: string;
  name: string;
  name_th: string | null;
}

type PetType = {
  id: string;
  name: string;
  name_th: string | null;
} | null;

function SortableMediaThumb({
  id,
  item,
  isSelected,
  onSelect,
}: {
  id: number;
  item: { type: "image" | "video"; url: string };
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
      className={`relative w-16 h-16 rounded-lg overflow-hidden shrink-0 border-2 transition-all cursor-grab active:cursor-grabbing ${
        isSelected ? "border-orange-500 ring-1 ring-orange-200" : "border-stone-200 hover:border-stone-300"
      }`}
      title="ลากเพื่อจัดลำดับ"
    >
      {item.type === "video" ? (
        <div className="relative w-full h-full bg-stone-200 select-none pointer-events-none" draggable={false}>
          <video src={item.url} className="w-full h-full object-cover" muted preload="metadata" playsInline />
          <span className="absolute inset-0 flex items-center justify-center text-lg text-white drop-shadow-lg">▶</span>
        </div>
      ) : (
        <Image src={item.url} alt="" fill className="object-cover select-none pointer-events-none" sizes="64px" draggable={false} />
      )}
    </div>
  );
}

interface ProductDetail {
  id: string;
  shopId: string;
  name: string;
  name_th: string | null;
  description: string;
  description_th: string | null;
  shortDescription: string | null;
  price: number;
  normalPrice: number | null;
  stock: number;
  images: string[];
  videos: string[];
  mediaOrder?: string[];
  active: boolean;
  featured: boolean;
  deliveryDays: number;
  fulfillmentMethod: string;
  category: Category;
  petType: PetType;
  variants: ProductVariant[];
  _count?: { marketingAssets: number };
}

interface SupplierLink {
  id: string;
  supplierPrice: number | null;
  supplier: {
    id: string;
    name: string;
    nameTh: string | null;
    imageUrl: string | null;
    tel: string | null;
    email: string | null;
    contact: string | null;
  };
}

interface PackSummary {
  id: string;
  lang: string;
  hooks: string[];
  createdAt: string;
}

export default function ProductViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useLocale();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [supplierLinks, setSupplierLinks] = useState<SupplierLink[]>([]);
  const [packs, setPacks] = useState<PackSummary[]>([]);
  const [packsLoading, setPacksLoading] = useState(true);
  const [addingAll, setAddingAll] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [marketingAssetsRefreshKey, setMarketingAssetsRefreshKey] = useState(0);
  const [editingPriceLinkId, setEditingPriceLinkId] = useState<string | null>(null);
  const [editPriceValue, setEditPriceValue] = useState("");
  const [hiddenSections, setHiddenSections] = useState<Set<string>>(new Set());

  const toggleSection = (sectionId: string) => {
    setHiddenSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const CollapsibleSection = ({
    id,
    title,
    children,
    actions,
  }: {
    id: string;
    title: string;
    children: React.ReactNode;
    actions?: React.ReactNode;
  }) => {
    const isHidden = hiddenSections.has(id);
    return (
      <div id={id} className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-stone-100">
          <h3 className="font-semibold text-stone-800">{title}</h3>
          <div className="flex items-center gap-2">
            {actions}
            <button
              type="button"
              onClick={() => toggleSection(id)}
              title={isHidden ? "แสดง" : "ซ่อน"}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-700 transition-transform"
            >
              <span className={`text-sm ${isHidden ? "" : "rotate-180"}`}>▼</span>
            </button>
          </div>
        </div>
        {!isHidden && <div className="p-5">{children}</div>}
      </div>
    );
  };

  const fetchProduct = () => {
    fetch(`/api/admin/products/${id}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => d.success && setProduct(d.data));
  };

  useEffect(() => {
    setProduct(null); // clear ก่อน fetch เพื่อไม่แสดง product เก่า
    fetchProduct();
  }, [id]);

  useEffect(() => {
    fetch(`/api/admin/product-suppliers?productId=${id}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setSupplierLinks(d.data); });
  }, [id]);

  useEffect(() => {
    fetch(`/api/admin/automation/marketing-packs?productId=${id}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setPacks(d.data); })
      .finally(() => setPacksLoading(false));
  }, [id]);

  useEffect(() => {
    setSelectedMediaIndex(0);
  }, [product?.id]);

  const startEditSupplierPrice = (link: SupplierLink) => {
    setEditingPriceLinkId(link.id);
    setEditPriceValue(link.supplierPrice != null ? String(link.supplierPrice) : "");
  };

  const handleSaveSupplierPrice = async (supplierId: string) => {
    try {
      const res = await fetch(`/api/admin/suppliers/${supplierId}/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierPrice: editPriceValue === "" ? null : Number(editPriceValue) }),
      });
      const data = await res.json();
      if (data.success) {
        const newPrice = data.data?.supplierPrice ?? (editPriceValue === "" ? null : Number(editPriceValue));
        setSupplierLinks((prev) =>
          prev.map((l) => (l.supplier.id === supplierId ? { ...l, supplierPrice: newPrice } : l))
        );
        setEditingPriceLinkId(null);
        setEditPriceValue("");
        toast.success("บันทึกราคาแล้ว");
      } else {
        toast.error(data.error ?? "บันทึกไม่สำเร็จ");
      }
    } catch {
      toast.error("บันทึกไม่สำเร็จ");
    }
  };

  const handleAddAllToMarketingAssets = async () => {
    setAddingAll(true);
    try {
      const res = await fetch(`/api/admin/products/${id}/add-images-to-marketing-assets`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        const msg = data.data.created > 0
          ? `เพิ่ม ${data.data.created} รูปใน marketing assets แล้ว`
          : "รูปทั้งหมดอยู่ใน marketing assets แล้ว";
        toast.success(msg);
        fetchProduct();
        setMarketingAssetsRefreshKey((k) => k + 1);
      }
    } finally {
      setAddingAll(false);
    }
  };

  const handleMediaReorder = async (reordered: { type: "image" | "video"; url: string }[]) => {
    const res = await fetch(`/api/admin/products/${id}/display`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mediaItems: reordered }),
    });
    const data = await res.json();
    if (data.success) {
      toast.success("จัดลำดับแล้ว");
      fetchProduct();
    } else {
      toast.error(data.error ?? "จัดลำดับไม่สำเร็จ");
    }
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleMediaDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !product) return;
    const images = product.images ?? [];
    const videos = product.videos ?? [];
    const videoSet = new Set(videos);
    const mediaOrder = product.mediaOrder ?? [];
    const items =
      mediaOrder.length > 0
        ? mediaOrder.map((url) =>
            videoSet.has(url)
              ? ({ type: "video" as const, url })
              : ({ type: "image" as const, url })
          )
        : [
            ...images.map((url) => ({ type: "image" as const, url })),
            ...videos.map((url) => ({ type: "video" as const, url })),
          ];
    const oldIndex = Number(active.id);
    const newIndex = Number(over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    handleMediaReorder(reordered);
  };

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-stone-100 rounded w-48" />
          <div className="h-48 bg-stone-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  const images = product.images ?? [];
  const videos = product.videos ?? [];
  const videoSet = new Set(videos);
  const mediaOrder = product.mediaOrder ?? [];
  const mediaItems =
    mediaOrder.length > 0
      ? mediaOrder.map((url) =>
          videoSet.has(url)
            ? ({ type: "video" as const, url })
            : ({ type: "image" as const, url })
        )
      : [
          ...images.map((url) => ({ type: "image" as const, url })),
          ...videos.map((url) => ({ type: "video" as const, url })),
        ];
  const selectedMedia = mediaItems[selectedMediaIndex] ?? mediaItems[0];
  const displayPrice = product.normalPrice ?? product.price;

  return (
    <div key={id} className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/admin/products" className="text-stone-400 hover:text-stone-600">
            ← รายการสินค้า
          </Link>
          <Link href={`/admin/products/${id}`} className="text-stone-400 hover:text-stone-600">
            แก้ไข
          </Link>
          <h1 className="text-2xl font-bold text-stone-800">{t("productDetail", "adminPages")}: {product.name_th ?? product.name}</h1>
          {hiddenSections.size > 0 && (
            <button
              type="button"
              onClick={() => setHiddenSections(new Set())}
              className="text-xs text-stone-500 hover:text-stone-700"
            >
              แสดงทั้งหมด
            </button>
          )}
        </div>
        <button
          onClick={handleAddAllToMarketingAssets}
          disabled={addingAll || (product.images.length === 0 && product.variants.every((v) => !v.variantImage))}
          className="btn-outline text-sm py-2 px-4"
        >
          {addingAll ? "กำลังเพิ่ม..." : "เพิ่มรูปทั้งหมดเข้า Marketing Assets"}
        </button>
      </div>

      {/* Product hero */}
      <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
        <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-96 lg:w-[420px] shrink-0 space-y-3">
            <div className="relative aspect-square rounded-xl overflow-hidden bg-stone-50">
              {selectedMedia?.type === "video" ? (
                <video src={selectedMedia.url} className="w-full h-full object-contain" controls playsInline />
              ) : selectedMedia?.url ? (
                <Image src={selectedMedia.url} alt={product.name} fill className="object-contain" sizes="320px" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl text-stone-300">📦</div>
              )}
            </div>
            {mediaItems.length > 1 && (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleMediaDragEnd}>
                <SortableContext items={mediaItems.map((_, i) => i)} strategy={rectSortingStrategy}>
                  <div className="flex flex-wrap gap-2">
                    {mediaItems.map((item, i) => (
                      <SortableMediaThumb
                        key={i}
                        id={i}
                        item={item}
                        isSelected={selectedMediaIndex === i}
                        onSelect={() => setSelectedMediaIndex(i)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-stone-800">{product.name_th ?? product.name}</h2>
            <p className="text-stone-500 text-sm mt-0.5">{product.name}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="text-xs px-2 py-1 rounded-full bg-stone-100 text-stone-600">
                {product.category.name_th ?? product.category.name}
              </span>
              {product.petType && (
                <span className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700">
                  {product.petType.name_th ?? product.petType.name}
                </span>
              )}
              {product.featured && (
                <span className="text-xs px-2 py-1 rounded-full bg-purple-50 text-purple-700">Featured</span>
              )}
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-xl font-bold text-stone-800">฿{displayPrice.toLocaleString()}</span>
              {product.normalPrice != null && product.normalPrice > product.price && (
                <span className="text-sm text-stone-400 line-through">฿{product.normalPrice.toLocaleString()}</span>
              )}
            </div>
            <p className="text-sm text-stone-600 mt-2">
              สต็อกรวม: {product.stock} · จัดส่งภายใน {product.deliveryDays} วัน
              {product._count?.marketingAssets != null && (
                <>
                  {" · "}
                  <a href="#marketing-assets" className="text-orange-500 hover:text-orange-600 hover:underline">
                    {product._count.marketingAssets} marketing assets
                  </a>
                </>
              )}
            </p>
            {product.shortDescription && (
              <p className="text-sm text-stone-600 mt-3 line-clamp-3">{product.shortDescription}</p>
            )}
            <div className="mt-4">
              <Link
                href={`/admin/ad-designer?productId=${id}&returnUrl=${encodeURIComponent(`/admin/products/${id}/view`)}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 shadow-sm transition-colors"
              >
                🎨 Ads Creator
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Variant images gallery */}
      {product.variants.some((v) => v.variantImage) && (
        <CollapsibleSection id="variant-images" title="รูปตัวเลือกสินค้า">
          <div className="flex flex-wrap gap-3">
            {product.variants
              .filter((v) => v.variantImage)
              .map((v) => (
                <div key={v.id} className="flex flex-col items-center gap-1.5">
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-stone-100 border border-stone-100">
                    <Image src={v.variantImage!} alt={[v.size, v.color].filter(Boolean).join(" ") || "variant"} fill className="object-cover" sizes="80px" />
                  </div>
                  <span className="text-[11px] text-stone-500">
                    {[v.size, v.color].filter(Boolean).join(" / ") || "—"}
                  </span>
                </div>
              ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Marketing Packs */}
      <CollapsibleSection
        id="marketing-packs"
        title="Marketing Packs"
        actions={
          <div className="flex gap-2">
            <Link
              href={`/admin/automation/marketing-packs?productId=${id}`}
              className="text-xs px-3 py-1.5 rounded-lg border border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors font-medium"
            >
              + Manual Add
            </Link>
            <Link
              href="/admin/automation/creative"
              className="text-xs px-3 py-1.5 rounded-lg border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors font-medium"
            >
              ✨ AI Generate
            </Link>
          </div>
        }
      >
        {packsLoading ? (
          <p className="text-xs text-stone-400">กำลังโหลด...</p>
        ) : packs.length === 0 ? (
          <p className="text-sm text-stone-400">ยังไม่มี Marketing Pack — สร้างใหม่ได้เลย</p>
        ) : (
          <div className="space-y-2">
            {packs.map((pack) => (
              <Link
                key={pack.id}
                href={`/admin/automation/marketing-packs/${pack.id}`}
                className="flex items-center gap-3 p-3 rounded-xl border border-stone-100 hover:border-orange-200 hover:bg-orange-50/50 transition-colors group"
              >
                <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-stone-100 text-stone-500 group-hover:bg-orange-100 group-hover:text-orange-600">
                  {pack.lang}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-stone-600 truncate">{pack.hooks?.[0] ?? "—"}</p>
                </div>
                <span className="text-[11px] text-stone-400 shrink-0">
                  {new Date(pack.createdAt).toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                </span>
                <span className="text-stone-300 group-hover:text-orange-400 text-xs">→</span>
              </Link>
            ))}
          </div>
        )}
      </CollapsibleSection>

      {/* Variants */}
      {product.variants.length > 0 && (
        <CollapsibleSection id="variants" title={`ตัวเลือกสินค้า (${product.variants.length} รายการ)`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100">
                  <th className="text-left py-2 text-stone-500 font-medium w-14">รูป</th>
                  <th className="text-left py-2 text-stone-500 font-medium">Size / Color</th>
                  <th className="text-right py-2 text-stone-500 font-medium">ราคา</th>
                  <th className="text-right py-2 text-stone-500 font-medium">สต็อก</th>
                  <th className="text-left py-2 text-stone-500 font-medium">SKU</th>
                  <th className="text-left py-2 text-stone-500 font-medium">CJ Vid</th>
                  <th className="text-right py-2 text-stone-500 font-medium">CJ สต็อก</th>
                  <th className="text-left py-2 text-stone-500 font-medium">จัดส่ง</th>
                  <th className="text-center py-2 text-stone-500 font-medium w-14">สถานะ</th>
                  <th className="text-left py-2 text-stone-500 font-medium">Attributes</th>
                </tr>
              </thead>
              <tbody>
                {product.variants.map((v) => (
                  <tr key={v.id} className="border-b border-stone-50 last:border-0 hover:bg-stone-50/50">
                    <td className="py-2">
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-stone-100 shrink-0">
                        {v.variantImage ? (
                          <Image src={v.variantImage} alt={[v.size, v.color].filter(Boolean).join(" ") || "variant"} fill className="object-cover" sizes="48px" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-stone-300 text-lg">📦</div>
                        )}
                      </div>
                    </td>
                    <td className="py-2">
                      {[v.size, v.color].filter(Boolean).join(" / ") || "—"}
                    </td>
                    <td className="text-right py-2 font-medium">฿{v.price.toLocaleString()}</td>
                    <td className="text-right py-2">{v.stock}</td>
                    <td className="py-2 text-stone-600 font-mono text-xs">{v.sku ?? "—"}</td>
                    <td className="py-2 text-stone-500 font-mono text-xs">{v.cjVid ?? "—"}</td>
                    <td className="text-right py-2 text-stone-500">{v.cjStock != null ? v.cjStock : "—"}</td>
                    <td className="py-2 text-stone-500 text-xs">
                      {v.fulfillmentMethod === "CJ" ? "CJ" : v.fulfillmentMethod === "SUPPLIER" ? "Supplier" : "ส่งเอง"}
                    </td>
                    <td className="py-2 text-center">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${v.active ? "bg-green-100 text-green-700" : "bg-stone-100 text-stone-500"}`}>
                        {v.active ? "เปิด" : "ปิด"}
                      </span>
                    </td>
                    <td className="py-2">
                      {v.attributes && Array.isArray(v.attributes) && v.attributes.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {(v.attributes as { name: string; value: string }[]).map((a, i) => (
                            <span key={i} className="text-[10px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded">
                              {a.name}: {a.value}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-stone-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CollapsibleSection>
      )}

      {/* Suppliers */}
      <CollapsibleSection
        id="suppliers"
        title="Suppliers"
        actions={
          <Link
            href={`/admin/products/${id}`}
            className="text-xs text-teal-600 hover:text-teal-700 font-medium"
          >
            แก้ไข →
          </Link>
        }
      >
        {supplierLinks.length === 0 ? (
          <p className="text-sm text-stone-400">ยังไม่มี supplier</p>
        ) : (
          <div className="space-y-2">
            {supplierLinks.map((link) => (
              <div
                key={link.id}
                className="flex flex-wrap items-center gap-3 p-3 rounded-xl border border-stone-100 hover:border-teal-200 hover:bg-teal-50/50 transition-colors group"
              >
                {link.supplier.imageUrl ? (
                  <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-stone-100 shrink-0">
                    <Image src={link.supplier.imageUrl} alt="" fill className="object-cover" sizes="32px" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-400 text-sm shrink-0">
                    🏭
                  </div>
                )}
                <Link
                  href={`/admin/suppliers/${link.supplier.id}`}
                  className="flex-1 min-w-0 flex flex-col gap-0.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-stone-700">
                      {link.supplier.name}
                      {link.supplier.nameTh && (
                        <span className="text-stone-400 ml-1">({link.supplier.nameTh})</span>
                      )}
                    </span>
                    <span className="text-stone-300 group-hover:text-teal-400 text-xs">→</span>
                  </div>
                  {(link.supplier.tel || link.supplier.email || link.supplier.contact) && (
                    <span className="text-xs text-stone-500">
                      {[
                        link.supplier.tel && `📞 ${link.supplier.tel}`,
                        link.supplier.email && `✉️ ${link.supplier.email}`,
                        link.supplier.contact,
                      ].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </Link>
                <div className="shrink-0 flex items-center gap-2">
                  <span className="text-xs text-stone-400">ราคา Supplier:</span>
                  {editingPriceLinkId === link.id ? (
                    <span className="flex items-center gap-1">
                      <input
                        type="number"
                        value={editPriceValue}
                        onChange={(e) => setEditPriceValue(e.target.value)}
                        className="w-20 text-sm border border-stone-200 rounded px-2 py-1"
                        placeholder="0"
                        step="0.01"
                        min="0"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveSupplierPrice(link.supplier.id)}
                        className="text-xs px-2 py-1 rounded bg-teal-500 text-white hover:bg-teal-600"
                      >
                        บันทึก
                      </button>
                      <button
                        type="button"
                        onClick={() => { setEditingPriceLinkId(null); setEditPriceValue(""); }}
                        className="text-xs text-stone-500 hover:text-stone-700"
                      >
                        ยกเลิก
                      </button>
                    </span>
                  ) : (
                    <span className="text-sm font-medium text-stone-600">
                      {link.supplierPrice != null ? (
                        <>
                          ฿{link.supplierPrice.toLocaleString()}
                          <button
                            type="button"
                            onClick={() => startEditSupplierPrice(link)}
                            className="ml-1 text-teal-500 hover:text-teal-600 text-xs"
                          >
                            แก้ไข
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEditSupplierPrice(link)}
                          className="text-teal-500 hover:text-teal-600 text-xs"
                        >
                          + ใส่ราคา
                        </button>
                      )}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      {/* Description EN */}
      {product.description && (
        <CollapsibleSection id="description-en" title="รายละเอียด (EN)">
          <div className="text-sm text-stone-600 prose prose-sm desc-html max-w-none" dangerouslySetInnerHTML={{ __html: product.description }} />
        </CollapsibleSection>
      )}
      {/* Description TH */}
      {product.description_th && (
        <CollapsibleSection id="description-th" title="รายละเอียด (TH)">
          <div className="text-sm text-stone-600 prose prose-sm desc-html max-w-none" dangerouslySetInnerHTML={{ __html: product.description_th }} />
        </CollapsibleSection>
      )}

      {/* Marketing Assets */}
      <CollapsibleSection id="marketing-assets" title="Marketing Assets">
        <MarketingAssetsSection
          productId={id}
          productImages={product.images}
          productVideos={product.videos ?? []}
          productMediaOrder={
            (product.mediaOrder && product.mediaOrder.length > 0 ? product.mediaOrder : [...(product.images ?? []), ...(product.videos ?? [])]) as string[]
          }
          onDisplayChange={fetchProduct}
          refreshKey={marketingAssetsRefreshKey}
          count={product._count?.marketingAssets}
          productName={product.name_th ?? product.name}
          productContext={{
            name: product.name,
            name_th: product.name_th ?? undefined,
            price: product.price,
            normalPrice: product.normalPrice ?? undefined,
            shortDescription: product.shortDescription ?? undefined,
          }}
        />
      </CollapsibleSection>

    </div>
  );
}
