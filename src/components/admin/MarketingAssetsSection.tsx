"use client";

import { useEffect, useState, useRef, useCallback, memo } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatSize } from "@/lib/utils";
import toast from "react-hot-toast";
import AIImageGenModal, { type ProductContext } from "@/components/admin/AIImageGenModal";
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

interface MarketingAsset {
  id: string;
  url: string;
  type: string;
  name: string | null;
  filename: string | null;
  contentType: string | null;
  sizeBytes: number | null;
  width: number | null;
  height: number | null;
  productId: string | null;
  marketingPackId: string | null;
  prompt: string | null;
  angle: string | null;
  note: string | null;
  marketingPack?: { id: string; productName: string; lang: string } | null;
  product?: {
    id: string;
    name: string;
    name_th: string | null;
    images?: string[];
    videos?: string[];
  } | null;
}

function formatLabel(ct: string | null): string {
  if (!ct) return "—";
  const m: Record<string, string> = {
    "image/jpeg": "JPEG",
    "image/png": "PNG",
    "image/webp": "WebP",
    "image/gif": "GIF",
    "video/mp4": "MP4",
    "video/webm": "WebM",
    "application/pdf": "PDF",
  };
  return m[ct] ?? ct.split("/").pop() ?? ct;
}

function extractFilenameFromUrl(url: string): string | null {
  try {
    const path = new URL(url).pathname;
    const name = path.split("/").pop();
    return name && name.length > 0 ? decodeURIComponent(name) : null;
  } catch {
    return null;
  }
}

function getExtensionFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname;
    const ext = path.split(".").pop()?.toLowerCase();
    const m: Record<string, string> = {
      jpg: "JPEG", jpeg: "JPEG", png: "PNG", webp: "WebP", gif: "GIF",
      mp4: "MP4", webm: "WebM",
    };
    return ext && m[ext] ? m[ext] : ext ?? "—";
  } catch {
    return "—";
  }
}

const SortableAssetCard = memo(function SortableAssetCard({
  asset,
  productId,
  marketingPackId,
  productImages,
  productVideos,
  isProductImage,
  isProductVideo,
  onAddToProductImages,
  onRemoveFromProductImages,
  onAddToProductVideos,
  onRemoveFromProductVideos,
  onDelete,
  deletingId,
  onSave,
  onAiGenClick,
}: {
  asset: MarketingAsset;
  productId?: string;
  marketingPackId?: string;
  productImages: string[];
  productVideos: string[];
  isProductImage: (url: string) => boolean;
  isProductVideo: (url: string) => boolean;
  onAddToProductImages: (url: string) => void;
  onRemoveFromProductImages: (url: string) => void;
  onAddToProductVideos: (url: string) => void;
  onRemoveFromProductVideos: (url: string) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
  onSave: (id: string, name: string, note: string) => Promise<void>;
  onAiGenClick?: (imageUrl: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: asset.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    willChange: isDragging ? "transform" : undefined,
    zIndex: isDragging ? 1 : undefined,
    contain: "layout",
  };
  const [localName, setLocalName] = useState(asset.name ?? "");
  const [localNote, setLocalNote] = useState(asset.note ?? "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocalName(asset.name ?? "");
  }, [asset.name]);
  useEffect(() => {
    setLocalNote(asset.note ?? "");
  }, [asset.note]);

  const hasChanges = localName !== (asset.name ?? "") || localNote !== (asset.note ?? "");
  const handleSave = async () => {
    if (!hasChanges) return;
    setSaving(true);
    try {
      await onSave(asset.id, localName, localNote);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };
  const handleCancel = () => {
    setLocalName(asset.name ?? "");
    setLocalNote(asset.note ?? "");
    setEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-xl border border-stone-100 overflow-hidden bg-stone-50 ${isDragging ? "pointer-events-none" : ""}`}
    >
      <div
        {...attributes}
        {...listeners}
        className="aspect-square relative bg-stone-100 cursor-grab active:cursor-grabbing touch-none"
        title="ลากเพื่อจัดลำดับ"
      >
        {asset.type === "IMAGE" ? (
          <Image src={asset.url} alt={asset.name ?? asset.filename ?? ""} fill className="object-cover" sizes="200px" draggable={false} />
        ) : asset.type === "VIDEO" ? (
          <video src={asset.url} className="w-full h-full object-cover" muted draggable={false} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">📄</div>
        )}
      </div>
      <div className="p-3 space-y-1">
        {productId && (asset.type === "IMAGE" || asset.type === "VIDEO") && (
          <div className="flex flex-wrap gap-1 mb-1">
            {asset.type === "IMAGE" ? (
              isProductImage(asset.url) ? (
                <>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 font-medium">รูปสินค้า</span>
                  <button
                    type="button"
                    onClick={() => onRemoveFromProductImages(asset.url)}
                    className="text-[9px] px-1.5 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-600"
                    title="เอาออกจากรูปสินค้าที่แสดงในหน้ารายละเอียด"
                  >
                    เอาออกจากรูปสินค้า
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => onAddToProductImages(asset.url)}
                  className="text-[9px] px-1.5 py-0.5 rounded bg-orange-100 hover:bg-orange-200 text-orange-700"
                >
                  + เป็นรูปสินค้า
                </button>
              )
            ) : asset.type === "VIDEO" ? (
              isProductVideo(asset.url) ? (
                <>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">วิดีโอสินค้า</span>
                  <button
                    type="button"
                    onClick={() => onRemoveFromProductVideos(asset.url)}
                    className="text-[9px] px-1.5 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-600"
                    title="เอาออกจากวิดีโอสินค้าที่แสดงในหน้ารายละเอียด"
                  >
                    เอาออกจากวิดีโอสินค้า
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => onAddToProductVideos(asset.url)}
                  className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 hover:bg-blue-200 text-blue-700"
                >
                  + เป็นวิดีโอสินค้า
                </button>
              )
            ) : null}
          </div>
        )}
        {asset.product && !productId && (
          <>
            {(asset.type === "IMAGE" || asset.type === "VIDEO") &&
              (asset.product.images?.includes(asset.url) || asset.product.videos?.includes(asset.url)) && (
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                    asset.type === "VIDEO" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"
                  }`}
                >
                  {asset.type === "VIDEO" ? "วิดีโอสินค้า" : "รูปสินค้า"}
                </span>
              )}
            <Link
              href={`/admin/products/${asset.product.id}/view`}
              className="block text-[10px] text-blue-600 hover:text-blue-700 truncate"
              title={`${asset.product.name} (${asset.product.id})`}
            >
              📦 {asset.product.name_th ?? asset.product.name}
            </Link>
          </>
        )}
        <div className="flex items-center justify-between gap-1 text-xs">
          <span className="font-medium text-stone-600 truncate">
            {formatLabel(asset.contentType) !== "—"
              ? formatLabel(asset.contentType)
              : (asset.type === "IMAGE" || asset.type === "VIDEO")
                ? getExtensionFromUrl(asset.url)
                : "—"}
          </span>
          {asset.sizeBytes != null && (
            <span className="text-stone-400 shrink-0">{formatSize(asset.sizeBytes)}</span>
          )}
        </div>
        {asset.type === "IMAGE" && asset.width != null && asset.height != null && (
          <p className="text-[10px] text-stone-400">{asset.width} × {asset.height}</p>
        )}
        {editing ? (
          <>
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-stone-500 font-medium">Name</label>
              <input
                type="text"
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                placeholder=""
                className="text-xs border border-stone-200 rounded-lg px-2 py-1.5 placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-orange-200 bg-white"
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-stone-500 font-medium">Note</label>
              <textarea
                value={localNote}
                onChange={(e) => setLocalNote(e.target.value)}
                placeholder=""
                rows={3}
                className="text-xs border border-stone-200 rounded-lg px-2 py-1.5 placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-orange-200 bg-white resize-y min-h-[4rem]"
              />
            </div>
            <div className="flex justify-end gap-1">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleCancel(); }}
                disabled={saving}
                className="text-[10px] px-2 py-1 rounded text-stone-500 hover:bg-stone-100 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleSave(); }}
                disabled={saving || !hasChanges}
                className="text-[10px] px-2 py-1 rounded bg-orange-500 hover:bg-orange-600 disabled:bg-stone-300 text-white font-medium transition-colors"
              >
                {saving ? "..." : "บันทึก"}
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-0.5">
            {localName ? <p className="text-sm font-medium text-stone-800 truncate">{localName}</p> : null}
            {localNote ? <p className="text-xs text-stone-500 whitespace-pre-wrap line-clamp-3">{localNote}</p> : null}
            {!localName && !localNote ? <p className="text-xs text-stone-400">—</p> : null}
          </div>
        )}
        {asset.productId && !productId && (
          <Link
            href={`/admin/products/${asset.productId}/view`}
            className="block text-[9px] text-stone-400 font-mono truncate hover:text-blue-600"
            title={asset.productId}
          >
            pid:{asset.productId.slice(0, 8)}
          </Link>
        )}
        {(asset.marketingPackId || asset.marketingPack) && !marketingPackId && (
          <Link
            href={`/admin/automation/marketing-packs/${asset.marketingPackId ?? asset.marketingPack!.id}`}
            className="block text-[9px] text-stone-400 font-mono truncate hover:text-blue-600"
            title={asset.marketingPackId ?? asset.marketingPack!.id}
          >
            mpid:{(asset.marketingPackId ?? asset.marketingPack!.id).slice(0, 8)}
          </Link>
        )}
        {(asset.angle || asset.prompt) && (
          <p className="text-[10px] text-purple-600 truncate" title={asset.prompt ?? undefined}>
            {asset.angle ?? (asset.prompt?.slice(0, 30) + "...")}
          </p>
        )}
        {!editing && (
          <div className="flex justify-end pt-0.5">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setEditing(true); }}
              className="text-[10px] text-orange-500 hover:text-orange-600 font-medium"
            >
              แก้ไข
            </button>
          </div>
        )}
      </div>
      <div className="absolute top-2 right-2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <a
          href={asset.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-white/20 bg-black/70 text-white shadow transition-all duration-150 hover:scale-110 hover:bg-black hover:ring-2 hover:ring-inset hover:ring-white/80"
          title="ดูเต็มขนาด"
          aria-label="ดู"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        </a>
        {asset.type === "IMAGE" && onAiGenClick && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onAiGenClick(asset.url); }}
            className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-purple-600 text-white text-[10px] transition-all duration-150 hover:scale-110 hover:bg-purple-500 hover:ring-2 hover:ring-inset hover:ring-white/80"
            title="AI สร้างรูป"
          >
            ✨
          </button>
        )}
        <a
          href={asset.url}
          download={asset.filename ?? ""}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-black/60 text-white text-[10px] transition-all duration-150 hover:scale-110 hover:bg-black hover:ring-2 hover:ring-inset hover:ring-white/80"
          title="ดาวน์โหลด"
        >
          ⬇
        </a>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(asset.id); }}
          disabled={deletingId === asset.id}
          className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-red-500/80 text-white text-[10px] transition-all duration-150 hover:scale-110 hover:bg-red-500 hover:ring-2 hover:ring-inset hover:ring-white/80 disabled:opacity-50 disabled:hover:scale-100 disabled:hover:ring-0"
          title="ลบ"
        >
          {deletingId === asset.id ? "..." : "✕"}
        </button>
      </div>
    </div>
  );
});

interface Props {
  shopId?: string;
  productId?: string;
  marketingPackId?: string;
  /** รูปที่ใช้แสดงใน product detail (สำหรับ badge + add/remove) */
  productImages?: string[];
  /** วิดีโอที่ใช้แสดงใน product detail */
  productVideos?: string[];
  /** ลำดับ media (urls) สำหรับ gallery — ใช้เมื่อ add/remove เพื่ออัปเดต mediaOrder ให้ถูกต้อง */
  productMediaOrder?: string[];
  /** เรียกหลัง add/remove จาก product display */
  onDisplayChange?: () => void;
  /** ซ่อนปุ่มอัปโหลด (เช่น เมื่อใช้ marketingPackId — assets มาจาก Save to Marketing Asset เท่านั้น) */
  hideUpload?: boolean;
  /** ใช้ refetch เมื่อ key เปลี่ยน (เช่น หลัง save สำเร็จ) */
  refreshKey?: string | number;
  /** จำนวน assets (แสดงในหัวข้อ ถ้ามี) */
  count?: number | null;
  /** ชื่อสินค้า (สำหรับ AI modal) */
  productName?: string | null;
  /** ข้อมูลสินค้าให้ AI ใช้ (แปะป้ายราคา, ใส่ข้อมูล) */
  productContext?: ProductContext | null;
}

const PAGE_SIZE = 32;

export default function MarketingAssetsSection({ shopId, productId, marketingPackId, productImages = [], productVideos = [], productMediaOrder, onDisplayChange, hideUpload, refreshKey, count, productName, productContext }: Props) {
  const [assets, setAssets] = useState<MarketingAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiModalImageUrl, setAiModalImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadAssets = useCallback((p: number) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (shopId) params.set("shopId", shopId);
    if (productId) params.set("productId", productId);
    if (marketingPackId) params.set("marketingPackId", marketingPackId);
    params.set("page", String(p));
    params.set("limit", String(PAGE_SIZE));
    fetch(`/api/admin/marketing-assets?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setAssets(d.data);
          setTotal(d.pagination?.total ?? d.data.length);
          setTotalPages(d.pagination?.totalPages ?? 1);
        }
      })
      .finally(() => setLoading(false));
  }, [shopId, productId, marketingPackId]);

  useEffect(() => {
    setPage(1);
  }, [shopId, productId, marketingPackId]);

  useEffect(() => {
    loadAssets(page);
  }, [loadAssets, page, refreshKey]);

  const goToPage = (p: number) => {
    if (p >= 1 && p <= totalPages) setPage(p);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    if (shopId) fd.append("shopId", shopId);
    if (productId) fd.append("productId", productId);
    try {
      const res = await fetch("/api/admin/marketing-assets/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success) {
        toast.success("อัปโหลดสำเร็จ");
        loadAssets(1);
      } else {
        toast.error(data.error ?? "อัปโหลดไม่สำเร็จ");
      }
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleEnrichMetadata = async () => {
    if (!productId) return;
    setEnriching(true);
    try {
      const res = await fetch(`/api/admin/marketing-assets/enrich?productId=${productId}`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        const { updated, failed } = data.data;
        if (updated > 0) toast.success(`อัปเดต metadata แล้ว ${updated} รายการ`);
        if (failed > 0) toast.error(`ดึง metadata ไม่ได้ ${failed} รายการ (URL อาจถูกบล็อกโดย CDN)`);
        loadAssets(page);
      } else {
        toast.error(data.error ?? "อัปเดตไม่สำเร็จ");
      }
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setEnriching(false);
    }
  };

  const needsEnrich = productId && assets.some((a) => a.contentType == null || a.sizeBytes == null);

  const handleDelete = async (id: string) => {
    if (!confirm("ลบไฟล์นี้? ไฟล์จะถูกลบจาก storage อย่างถาวร")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/marketing-assets/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("ลบแล้ว");
        setAssets((prev) => prev.filter((a) => a.id !== id));
        setTotal((t) => Math.max(0, t - 1));
        if (assets.length === 1 && page > 1) setPage((p) => p - 1);
        onDisplayChange?.(); // refresh product ถ้าลบ asset ที่เป็นรูปสินค้า
      } else {
        toast.error(data.error ?? "ลบไม่สำเร็จ");
      }
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setDeletingId(null);
    }
  };

  const isProductImage = (url: string) => productImages.some((u) => u === url || u.trim() === url.trim());
  const isProductVideo = (url: string) => productVideos.some((u) => u === url || u.trim() === url.trim());

  const adImages =
    productImages.length > 0
      ? productImages
      : assets
          .filter((a) => ((a.contentType ?? a.type ?? "").startsWith("image/")))
          .map((a) => a.url);

  const videoSet = new Set(productVideos);
  const currentMediaItems =
    productMediaOrder && productMediaOrder.length > 0
      ? productMediaOrder.map((u) => (videoSet.has(u) ? ({ type: "video" as const, url: u }) : ({ type: "image" as const, url: u })))
      : [
          ...productImages.map((u) => ({ type: "image" as const, url: u })),
          ...productVideos.map((u) => ({ type: "video" as const, url: u })),
        ];

  const handleAddToProductImages = async (url: string) => {
    if (!productId) return;
    const mediaItems = [...currentMediaItems, { type: "image" as const, url }];
    const res = await fetch(`/api/admin/products/${productId}/display`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mediaItems }),
    });
    const data = await res.json();
    if (data.success) {
      toast.success("เพิ่มเป็นรูปสินค้าแล้ว");
      onDisplayChange?.();
    } else {
      toast.error(data.error ?? "ไม่สำเร็จ");
    }
  };

  const handleRemoveFromProductImages = async (url: string) => {
    if (!productId) return;
    const mediaItems = currentMediaItems.filter((m) => m.url !== url && m.url.trim() !== url.trim());
    const res = await fetch(`/api/admin/products/${productId}/display`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mediaItems }),
    });
    const data = await res.json();
    if (data.success) {
      toast.success("เอาออกจากรูปสินค้าแล้ว");
      onDisplayChange?.();
    } else {
      toast.error(data.error ?? "ไม่สำเร็จ");
    }
  };

  const handleAddToProductVideos = async (url: string) => {
    if (!productId) return;
    const mediaItems = [...currentMediaItems, { type: "video" as const, url }];
    const res = await fetch(`/api/admin/products/${productId}/display`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mediaItems }),
    });
    const data = await res.json();
    if (data.success) {
      toast.success("เพิ่มเป็นวิดีโอสินค้าแล้ว");
      onDisplayChange?.();
    } else {
      toast.error(data.error ?? "ไม่สำเร็จ");
    }
  };

  const handleRemoveFromProductVideos = async (url: string) => {
    if (!productId) return;
    const mediaItems = currentMediaItems.filter((m) => m.url !== url && m.url.trim() !== url.trim());
    const res = await fetch(`/api/admin/products/${productId}/display`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mediaItems }),
    });
    const data = await res.json();
    if (data.success) {
      toast.success("เอาออกจากวิดีโอสินค้าแล้ว");
      onDisplayChange?.();
    } else {
      toast.error(data.error ?? "ไม่สำเร็จ");
    }
  };

  const handleReorder = useCallback(
    async (orderedIds: string[]) => {
      const body: {
        ids: string[];
        shopId?: string;
        productId?: string;
        marketingPackId?: string;
        page?: number;
        limit?: number;
      } = { ids: orderedIds, page, limit: PAGE_SIZE };
      if (shopId && !productId && !marketingPackId) body.shopId = shopId;
      else if (productId && !marketingPackId) body.productId = productId;
      else if (marketingPackId) body.marketingPackId = marketingPackId;

      const res = await fetch("/api/admin/marketing-assets/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("จัดลำดับแล้ว");
      } else {
        toast.error(data.error ?? "จัดลำดับไม่สำเร็จ");
      }
    },
    [shopId, productId, marketingPackId, page]
  );

  const handleSave = useCallback(async (id: string, name: string, note: string) => {
    const res = await fetch(`/api/admin/marketing-assets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name || null, note: note || null }),
    });
    if (res.ok) {
      toast.success("บันทึกแล้ว");
    } else {
      const data = await res.json();
      toast.error(data.error ?? "บันทึกไม่สำเร็จ");
    }
  }, []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = assets.findIndex((a) => a.id === active.id);
    const newIndex = assets.findIndex((a) => a.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(assets, oldIndex, newIndex);
    setAssets(reordered);
    handleReorder(reordered.map((a) => a.id));
  };

  return (
    <div id="marketing-assets" className="bg-white rounded-2xl border border-stone-100 p-6 scroll-mt-4">
      <div className="flex items-center justify-between mb-4">
        <a
          href="#marketing-assets"
          className="font-semibold text-stone-800 hover:text-orange-600 transition-colors cursor-pointer"
        >
          Marketing Assets
          <span className="ml-2 text-stone-500 font-normal">
            ({total > 0 ? total : count ?? 0} ชิ้น{totalPages > 1 ? ` · หน้า ${page}/${totalPages}` : ""})
          </span>
        </a>
        {((!hideUpload || needsEnrich) || (productId && productContext)) && (
          <div className="flex items-center gap-2">
            {productId && productContext && (
              <Link
                href={`/admin/ad-designer?productId=${productId}&${marketingPackId ? `marketingPackId=${marketingPackId}&` : ""}returnUrl=${encodeURIComponent(marketingPackId ? `/admin/automation/marketing-packs/${marketingPackId}` : `/admin/products/${productId}/view`)}`}
                className="text-[11px] px-2.5 py-1 rounded-full border border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100"
              >
                Ads Creator
              </Link>
            )}
            {needsEnrich && (
              <button
                type="button"
                onClick={handleEnrichMetadata}
                disabled={enriching}
                className="btn-outline text-sm py-2 px-4"
                title="ดึงรายละเอียด (ขนาด, รูปแบบ) จาก URL"
              >
                {enriching ? "กำลังอัปเดต..." : "อัปเดต metadata"}
              </button>
            )}
            {!hideUpload && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*,.pdf"
                  className="hidden"
                  onChange={handleUpload}
                  disabled={uploading}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="btn-primary text-sm py-2 px-4"
                >
                  {uploading ? "กำลังอัปโหลด..." : "+ อัปโหลด"}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="aspect-square bg-stone-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : assets.length === 0 ? (
        <div className="text-center py-12 text-stone-400 text-sm">
          {hideUpload ? "ยังไม่มีรูปจาก Generate — กด Save to Marketing Asset ใน Image Ad Prompts" : "ยังไม่มีไฟล์ — กดอัปโหลดเพื่อเพิ่มรูป/วิดีโอ/PDF"}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={assets.map((a) => a.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {assets.map((asset) => (
                <SortableAssetCard
                  key={asset.id}
                  asset={asset}
                  productId={productId}
                  marketingPackId={marketingPackId}
                  productImages={productImages}
                  productVideos={productVideos}
                  isProductImage={isProductImage}
                  isProductVideo={isProductVideo}
                  onAddToProductImages={handleAddToProductImages}
                  onRemoveFromProductImages={handleRemoveFromProductImages}
                  onAddToProductVideos={handleAddToProductVideos}
                  onRemoveFromProductVideos={handleRemoveFromProductVideos}
                  onDelete={handleDelete}
                  deletingId={deletingId}
                  onSave={handleSave}
                  onAiGenClick={productId ? (url) => setAiModalImageUrl(url) : undefined}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            type="button"
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded-lg border border-stone-200 text-sm text-stone-600 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← ก่อนหน้า
          </button>
          <span className="text-sm text-stone-500">
            หน้า {page} จาก {totalPages}
          </span>
          <button
            type="button"
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1.5 rounded-lg border border-stone-200 text-sm text-stone-600 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ถัดไป →
          </button>
        </div>
      )}

      {aiModalImageUrl && (
        <AIImageGenModal
          imageUrl={aiModalImageUrl}
          productId={productId ?? undefined}
          marketingPackId={marketingPackId ?? undefined}
          productName={productName ?? undefined}
          productContext={productContext ?? undefined}
          onClose={() => setAiModalImageUrl(null)}
          onSaveSuccess={() => loadAssets(page)}
        />
      )}
    </div>
  );
}
