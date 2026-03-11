"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatSize } from "@/lib/utils";
import toast from "react-hot-toast";

interface MarketingAsset {
  id: string;
  url: string;
  type: string;
  filename: string | null;
  contentType: string | null;
  sizeBytes: number | null;
  width: number | null;
  height: number | null;
  productId: string | null;
  marketingPackId: string | null;
  prompt: string | null;
  angle: string | null;
  marketingPack?: { id: string; productName: string; lang: string } | null;
  product?: { id: string; name: string; name_th: string | null } | null;
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

interface Props {
  shopId?: string;
  productId?: string;
  marketingPackId?: string;
  /** รูปที่ใช้แสดงใน product detail (สำหรับ badge + add/remove) */
  productImages?: string[];
  /** วิดีโอที่ใช้แสดงใน product detail */
  productVideos?: string[];
  /** เรียกหลัง add/remove จาก product display */
  onDisplayChange?: () => void;
  /** ซ่อนปุ่มอัปโหลด (เช่น เมื่อใช้ marketingPackId — assets มาจาก Save to Marketing Asset เท่านั้น) */
  hideUpload?: boolean;
  /** ใช้ refetch เมื่อ key เปลี่ยน (เช่น หลัง save สำเร็จ) */
  refreshKey?: string | number;
  /** จำนวน assets (แสดงในหัวข้อ ถ้ามี) */
  count?: number | null;
}

export default function MarketingAssetsSection({ shopId, productId, marketingPackId, productImages = [], productVideos = [], onDisplayChange, hideUpload, refreshKey, count }: Props) {
  const [assets, setAssets] = useState<MarketingAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadAssets = () => {
    const params = new URLSearchParams();
    if (shopId) params.set("shopId", shopId);
    if (productId) params.set("productId", productId);
    if (marketingPackId) params.set("marketingPackId", marketingPackId);
    fetch(`/api/admin/marketing-assets?${params}`)
      .then((r) => r.json())
      .then((d) => d.success && setAssets(d.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAssets();
  }, [shopId, productId, marketingPackId, refreshKey]);

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
        loadAssets();
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

  const handleDelete = async (id: string) => {
    if (!confirm("ลบไฟล์นี้? ไฟล์จะถูกลบจาก storage อย่างถาวร")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/marketing-assets/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("ลบแล้ว");
        setAssets((prev) => prev.filter((a) => a.id !== id));
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

  const handleAddToProductImages = async (url: string) => {
    if (!productId) return;
    const newImages = [...productImages, url];
    const res = await fetch(`/api/admin/products/${productId}/display`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images: newImages }),
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
    const newImages = productImages.filter((u) => u !== url && u.trim() !== url.trim());
    const res = await fetch(`/api/admin/products/${productId}/display`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images: newImages }),
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
    const newVideos = [...productVideos, url];
    const res = await fetch(`/api/admin/products/${productId}/display`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videos: newVideos }),
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
    const newVideos = productVideos.filter((u) => u !== url && u.trim() !== url.trim());
    const res = await fetch(`/api/admin/products/${productId}/display`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videos: newVideos }),
    });
    const data = await res.json();
    if (data.success) {
      toast.success("เอาออกจากวิดีโอสินค้าแล้ว");
      onDisplayChange?.();
    } else {
      toast.error(data.error ?? "ไม่สำเร็จ");
    }
  };

  return (
    <div id="marketing-assets" className="bg-white rounded-2xl border border-stone-100 p-6 scroll-mt-4">
      <div className="flex items-center justify-between mb-4">
        <a
          href="#marketing-assets"
          className="font-semibold text-stone-800 hover:text-orange-600 transition-colors cursor-pointer"
        >
          Marketing Assets
          {count != null && <span className="ml-2 text-stone-500 font-normal">({count} ชิ้น)</span>}
        </a>
        {!hideUpload && (
          <div className="flex items-center gap-2">
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="group relative rounded-xl border border-stone-100 overflow-hidden bg-stone-50"
            >
              <div className="aspect-square relative bg-stone-100">
                {asset.type === "IMAGE" ? (
                  <Image src={asset.url} alt={asset.filename ?? ""} fill className="object-cover" sizes="200px" />
                ) : asset.type === "VIDEO" ? (
                  <video src={asset.url} className="w-full h-full object-cover" muted />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">📄</div>
                )}
              </div>
              <div className="p-3 space-y-1">
                {productId && (asset.type === "IMAGE" || asset.type === "VIDEO") && (
                  <div className="flex flex-wrap gap-1 mb-1">
                    {asset.type === "IMAGE" && (
                      isProductImage(asset.url) ? (
                        <>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 font-medium">Product Image</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFromProductImages(asset.url)}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-600"
                          >
                            เอาออก
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddToProductImages(asset.url)}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-orange-100 hover:bg-orange-200 text-orange-700"
                        >
                          + เป็นรูปสินค้า
                        </button>
                      )
                    )}
                    {asset.type === "VIDEO" && (
                      isProductVideo(asset.url) ? (
                        <>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">Product Video</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFromProductVideos(asset.url)}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-600"
                          >
                            เอาออก
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddToProductVideos(asset.url)}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 hover:bg-blue-200 text-blue-700"
                        >
                          + เป็นวิดีโอสินค้า
                        </button>
                      )
                    )}
                  </div>
                )}
                {asset.product && !productId && (
                  <Link
                    href={`/admin/products/${asset.product.id}/view`}
                    className="block text-[10px] text-blue-600 hover:text-blue-700 truncate"
                    title={`${asset.product.name} (${asset.product.id})`}
                  >
                    📦 {asset.product.name_th ?? asset.product.name}
                  </Link>
                )}
                <div className="flex items-center justify-between gap-1 text-xs">
                  <span className="font-medium text-stone-600 truncate">{formatLabel(asset.contentType)}</span>
                  {asset.sizeBytes != null && (
                    <span className="text-stone-400 shrink-0">{formatSize(asset.sizeBytes)}</span>
                  )}
                </div>
                {asset.type === "IMAGE" && asset.width != null && asset.height != null && (
                  <p className="text-[10px] text-stone-400">{asset.width} × {asset.height}</p>
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
              </div>
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <a
                  href={asset.url}
                  download={asset.filename ?? "asset"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-black/60 hover:bg-black/80 text-white text-[10px]"
                >
                  ⬇
                </a>
                <button
                  onClick={() => handleDelete(asset.id)}
                  disabled={deletingId === asset.id}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-500/80 hover:bg-red-500 text-white text-[10px] disabled:opacity-50"
                >
                  {deletingId === asset.id ? "..." : "✕"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
