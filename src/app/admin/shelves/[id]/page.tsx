"use client";

import { useEffect, useState, useCallback, useRef, use } from "react";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import { formatPrice } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  images: string[];
  category: { name: string; icon: string | null };
}

interface ShelfItem {
  id: string;
  productId: string;
  order: number;
  product: Product;
}

interface Shelf {
  id: string;
  name: string;
  name_th: string | null;
  slug: string;
  description: string | null;
  description_th: string | null;
  color: string;
  active: boolean;
  shop: { id: string; name: string } | null;
}

export default function ShelfDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [shelf, setShelf] = useState<Shelf | null>(null);
  const [items, setItems] = useState<ShelfItem[]>([]);
  const [available, setAvailable] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  // Drag state
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/shelves/${id}/items?search=${encodeURIComponent(search)}`);
      const json = await res.json();
      if (json.success) {
        setShelf(json.data.shelf);
        setItems(json.data.items);
        setAvailable(json.data.available);
      }
    } finally {
      setLoading(false);
    }
  }, [id, search]);

  useEffect(() => {
    const t = setTimeout(fetchData, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [fetchData, search]);

  // ── Add product ───────────────────────────────────────────────────────────
  const handleAdd = async (productId: string) => {
    setToggling(productId);
    const res = await fetch(`/api/admin/shelves/${id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", productId }),
    });
    const data = await res.json();
    if (data.success) {
      toast.success("เพิ่มสินค้าแล้ว");
      fetchData();
    } else {
      toast.error(data.error || "เกิดข้อผิดพลาด");
    }
    setToggling(null);
  };

  // ── Remove product ────────────────────────────────────────────────────────
  const handleRemove = async (productId: string) => {
    setToggling(productId);
    await fetch(`/api/admin/shelves/${id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove", productId }),
    });
    toast.success("นำสินค้าออกแล้ว");
    setItems((prev) => prev.filter((i) => i.productId !== productId));
    setToggling(null);
    fetchData();
  };

  // ── Reorder (drag) ────────────────────────────────────────────────────────
  const saveOrder = (ordered: ShelfItem[]) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      fetch(`/api/admin/shelves/${id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reorder", ids: ordered.map((i) => i.id) }),
      });
    }, 500);
  };

  const handleDragStart = (itemId: string) => setDragId(itemId);
  const handleDragOver = (e: React.DragEvent, itemId: string) => {
    e.preventDefault();
    setDragOverId(itemId);
  };
  const handleDrop = (targetItemId: string) => {
    if (!dragId || dragId === targetItemId) { setDragId(null); setDragOverId(null); return; }
    const updated = [...items];
    const fromIdx = updated.findIndex((i) => i.id === dragId);
    const toIdx = updated.findIndex((i) => i.id === targetItemId);
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);
    setItems(updated);
    setDragId(null);
    setDragOverId(null);
    saveOrder(updated);
  };

  // ── Arrow move ────────────────────────────────────────────────────────────
  const moveItem = (index: number, dir: -1 | 1) => {
    const updated = [...items];
    const swapIdx = index + dir;
    if (swapIdx < 0 || swapIdx >= updated.length) return;
    [updated[index], updated[swapIdx]] = [updated[swapIdx], updated[index]];
    setItems(updated);
    saveOrder(updated);
  };

  if (!shelf && !loading) {
    return (
      <div className="p-6 text-center text-stone-400">
        <p>ไม่พบ Shelf นี้</p>
        <Link href="/admin/shelves" className="text-orange-500 text-sm mt-2 inline-block">← กลับ</Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/shelves" className="text-stone-400 hover:text-orange-500 transition-colors text-sm">
          ← กลับรายการ Shelves
        </Link>
        {shelf && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-4 h-4 rounded-full border border-stone-200" style={{ backgroundColor: shelf.color }} />
            <h1 className="text-xl font-bold text-stone-800">{shelf.name_th || shelf.name}</h1>
            <span className="text-xs text-stone-400 font-mono">/{shelf.slug}</span>
            {shelf.shop && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 font-medium">
                {shelf.shop.name}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Color preview banner */}
      {shelf && (
        <div
          className="h-10 rounded-2xl flex items-center px-5"
          style={{ background: `linear-gradient(135deg, ${shelf.color}ee, ${shelf.color}99)` }}
        >
          <span className="text-white text-sm font-semibold">{shelf.name_th || shelf.name}</span>
          {(shelf.description_th || shelf.description) && (
            <span className="ml-3 text-white/70 text-xs">{shelf.description_th || shelf.description}</span>
          )}
        </div>
      )}

      {/* Products in shelf */}
      <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h2 className="font-semibold text-stone-800">
            สินค้าใน Shelf
            <span className="ml-2 text-sm font-normal text-stone-400">({items.length} รายการ)</span>
          </h2>
          <p className="text-xs text-stone-400 mt-0.5">ลาก ⠿ เพื่อเรียงลำดับ</p>
        </div>

        {loading ? (
          <div className="p-8 text-center text-stone-400 text-sm">กำลังโหลด...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-stone-300 text-sm">ยังไม่มีสินค้าใน Shelf นี้</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-5">
            {items.map((item, idx) => {
              const img = item.product.images?.[0] || `https://placehold.co/400x300/fff7ed/f97316?text=${encodeURIComponent(item.product.name)}`;
              const isPlaceholder = !item.product.images?.[0];
              return (
                <div
                  key={item.id}
                  className={`relative rounded-2xl border bg-white overflow-hidden transition-all cursor-grab active:cursor-grabbing select-none ${
                    dragOverId === item.id ? "border-orange-400 ring-2 ring-orange-200 scale-[1.02]" : "border-stone-100 hover:shadow-md hover:-translate-y-0.5"
                  } ${dragId === item.id ? "opacity-40 scale-95" : ""}`}
                  draggable
                  onDragStart={() => handleDragStart(item.id)}
                  onDragOver={(e) => handleDragOver(e, item.id)}
                  onDrop={() => handleDrop(item.id)}
                  onDragEnd={() => { setDragId(null); setDragOverId(null); }}
                >
                  {/* Image */}
                  <div className="relative h-36 bg-orange-50 overflow-hidden">
                    <Image src={img} alt={item.product.name} fill className="object-cover" sizes="200px" unoptimized={isPlaceholder} />
                    {/* Drag handle overlay */}
                    <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/30 flex items-center justify-center text-white text-xs">
                      ⠿
                    </div>
                    {/* Order badge */}
                    <div
                      className="absolute top-2 right-2 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center text-white shadow"
                      style={{ backgroundColor: shelf?.color || "#f97316" }}
                    >
                      {idx + 1}
                    </div>
                    {/* Stock badge */}
                    {item.product.stock === 0 && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="bg-white text-stone-700 font-bold px-2 py-0.5 rounded-full text-xs">สินค้าหมด</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <span className="text-xs text-orange-500 font-medium bg-orange-50 px-1.5 py-0.5 rounded-full">
                      {item.product.category.icon} {item.product.category.name}
                    </span>
                    <p className="font-semibold text-stone-800 text-sm mt-1.5 line-clamp-2 leading-snug">
                      {item.product.name}
                    </p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-stone-50">
                      <span className="text-sm font-bold text-orange-500">{formatPrice(item.product.price)}</span>
                      <button
                        onClick={() => handleRemove(item.productId)}
                        disabled={toggling === item.productId}
                        className="text-xs px-2 py-1 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors disabled:opacity-40"
                      >
                        นำออก
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add products */}
      <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h2 className="font-semibold text-stone-800 mb-3">เลือกสินค้า</h2>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาสินค้า..."
            className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
          />
        </div>

        {available.length === 0 ? (
          <div className="p-8 text-center text-stone-300 text-sm">
            {search ? "ไม่พบสินค้าที่ค้นหา" : "สินค้าทั้งหมดอยู่ใน Shelf แล้ว"}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-5">
            {available.map((product) => {
              const img = product.images?.[0] || `https://placehold.co/120x120/fff7ed/f97316?text=🐾`;
              const isPlaceholder = !product.images?.[0];
              return (
                <div key={product.id} className="border border-stone-100 rounded-xl overflow-hidden hover:border-orange-200 transition-colors">
                  <div className="relative aspect-square bg-stone-50">
                    <Image src={img} alt={product.name} fill className="object-cover" sizes="160px" unoptimized={isPlaceholder} />
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-medium text-stone-700 line-clamp-2 mb-1">{product.name}</p>
                    <p className="text-xs text-stone-400 mb-1">{product.category.icon} {product.category.name}</p>
                    <p className="text-xs font-semibold text-orange-500 mb-2">{formatPrice(product.price)}</p>
                    <button
                      onClick={() => handleAdd(product.id)}
                      disabled={toggling === product.id}
                      className="w-full text-xs py-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors disabled:opacity-40 font-medium"
                    >
                      {toggling === product.id ? "..." : "+ เพิ่ม"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
