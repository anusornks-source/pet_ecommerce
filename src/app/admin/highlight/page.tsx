"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import { formatPrice } from "@/lib/utils";

interface ProductRow {
  id: string;
  name: string;
  price: number;
  stock: number;
  images: string[];
  highlight: boolean;
  highlightOrder: number | null;
  category: { name: string; icon: string | null };
}

export default function AdminHighlightPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  // Drag state
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const highlighted = products
    .filter((p) => p.highlight)
    .sort((a, b) => (a.highlightOrder ?? 999) - (b.highlightOrder ?? 999));
  const available = products.filter((p) => !p.highlight);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/highlight?search=${encodeURIComponent(search)}`);
      const json = await res.json();
      if (json.success) setProducts(json.data);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(fetchProducts, 300);
    return () => clearTimeout(t);
  }, [fetchProducts]);

  const saveOrder = useCallback(async (ids: string[]) => {
    await fetch("/api/admin/highlight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reorder", ids }),
    });
  }, []);

  const applyReorder = useCallback(
    (fromId: string, toId: string) => {
      if (fromId === toId) return;
      setProducts((prev) => {
        const list = prev
          .filter((p) => p.highlight)
          .sort((a, b) => (a.highlightOrder ?? 999) - (b.highlightOrder ?? 999));

        const fromIdx = list.findIndex((p) => p.id === fromId);
        const toIdx = list.findIndex((p) => p.id === toId);
        if (fromIdx === -1 || toIdx === -1) return prev;

        const newList = [...list];
        const [moved] = newList.splice(fromIdx, 1);
        newList.splice(toIdx, 0, moved);

        const ids = newList.map((p) => p.id);
        const orderMap = new Map(ids.map((id, i) => [id, i + 1]));

        // Debounce API save
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => saveOrder(ids), 500);

        return prev.map((p) => ({
          ...p,
          highlightOrder: orderMap.has(p.id) ? (orderMap.get(p.id) ?? p.highlightOrder) : p.highlightOrder,
        }));
      });
    },
    [saveOrder]
  );

  // Drag handlers
  const onDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    // Needed for Firefox
    e.dataTransfer.setData("text/plain", id);
  };

  const onDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (id !== dragOverId) setDragOverId(id);
  };

  const onDrop = (e: React.DragEvent, toId: string) => {
    e.preventDefault();
    if (dragId && dragId !== toId) {
      applyReorder(dragId, toId);
    }
    setDragId(null);
    setDragOverId(null);
  };

  const onDragEnd = () => {
    setDragId(null);
    setDragOverId(null);
  };

  const toggle = async (productId: string) => {
    setToggling(productId);
    try {
      const product = products.find((p) => p.id === productId);
      const res = await fetch("/api/admin/highlight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle", productId }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchProducts();
        toast.success(product?.highlight ? "นำออกจาก Shelf แล้ว" : "เพิ่มเข้า Shelf แล้ว ✨");
      } else {
        toast.error("เกิดข้อผิดพลาด");
      }
    } finally {
      setToggling(null);
    }
  };

  const move = (id: string, direction: "up" | "down") => {
    const list = [...highlighted];
    const idx = list.findIndex((p) => p.id === id);
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === list.length - 1) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    applyReorder(id, list[swapIdx].id);
  };

  const getImage = (images: string[]) => {
    return images?.find((img) => {
      try { new URL(img); return true; } catch { return false; }
    }) || null;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-stone-800">Highlight Shelf ✨</h1>
        <p className="text-stone-500 mt-1 text-sm">เลือกสินค้าที่ต้องการแสดงบน Highlight Shelf หน้าแรก และจัดลำดับการแสดงผล</p>
      </div>

      {/* Shelf List */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-stone-700">
            สินค้าใน Shelf
            <span className="ml-2 bg-orange-100 text-orange-600 text-xs font-bold px-2 py-0.5 rounded-full">
              {highlighted.length}
            </span>
          </h2>
          <p className="text-xs text-stone-400">ลากที่ ⠿ หรือกดลูกศรเพื่อจัดลำดับ</p>
        </div>

        {highlighted.length === 0 ? (
          <div className="border-2 border-dashed border-stone-200 rounded-2xl p-10 text-center text-stone-400">
            <p className="text-4xl mb-2">📭</p>
            <p className="text-sm">ยังไม่มีสินค้าใน Shelf — เลือกสินค้าด้านล่าง</p>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 rounded-2xl p-4">
            <div className="space-y-2">
              {highlighted.map((p, idx) => {
                const img = getImage(p.images);
                const isDragging = dragId === p.id;
                const isDragOver = dragOverId === p.id && dragId !== p.id;

                return (
                  <div
                    key={p.id}
                    draggable
                    onDragStart={(e) => onDragStart(e, p.id)}
                    onDragOver={(e) => onDragOver(e, p.id)}
                    onDrop={(e) => onDrop(e, p.id)}
                    onDragEnd={onDragEnd}
                    className={`bg-white rounded-xl px-3 py-3 flex items-center gap-3 shadow-sm transition-all duration-150 select-none
                      ${isDragging ? "opacity-40 shadow-none scale-95" : "hover:shadow-md"}
                      ${isDragOver ? "border-2 border-orange-400 bg-orange-50" : "border-2 border-transparent"}
                    `}
                  >
                    {/* Drag handle */}
                    <span
                      className="text-stone-300 hover:text-stone-500 cursor-grab active:cursor-grabbing text-lg leading-none shrink-0 px-0.5"
                      title="ลากเพื่อจัดลำดับ"
                    >
                      ⠿
                    </span>

                    {/* Order badge */}
                    <span className="w-7 h-7 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>

                    {/* Image */}
                    <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-orange-50 shrink-0">
                      {img ? (
                        <Image src={img} alt={p.name} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg">📦</div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-stone-800 truncate text-sm">{p.name}</p>
                      <p className="text-xs text-stone-500">
                        {p.category.icon} {p.category.name} · {formatPrice(p.price)} · คงเหลือ {p.stock}
                      </p>
                    </div>

                    {/* Arrow buttons */}
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => move(p.id, "up")}
                        disabled={idx === 0}
                        className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 disabled:opacity-30 flex items-center justify-center text-sm transition-colors"
                        title="ขึ้น"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => move(p.id, "down")}
                        disabled={idx === highlighted.length - 1}
                        className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 disabled:opacity-30 flex items-center justify-center text-sm transition-colors"
                        title="ลง"
                      >
                        ↓
                      </button>
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => toggle(p.id)}
                      disabled={toggling === p.id}
                      className="shrink-0 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium transition-colors"
                    >
                      {toggling === p.id ? "..." : "นำออก"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Product Picker */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-stone-700">เลือกสินค้า</h2>
          <div className="relative">
            <input
              type="text"
              placeholder="ค้นหาสินค้า..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-8 py-1.5 text-sm w-56"
            />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 text-sm">🔍</span>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-stone-400 text-sm">กำลังโหลด...</div>
        ) : available.length === 0 ? (
          <div className="text-center py-12 text-stone-400 text-sm">
            {search ? "ไม่พบสินค้าที่ค้นหา" : "สินค้าทุกรายการอยู่ใน Shelf แล้ว"}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {available.map((p) => {
              const img = getImage(p.images);
              return (
                <div
                  key={p.id}
                  className="bg-white border border-stone-200 rounded-xl p-3 flex items-center gap-3 hover:border-orange-300 hover:bg-orange-50/30 transition-all group"
                >
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-orange-50 shrink-0">
                    {img ? (
                      <Image src={img} alt={p.name} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-stone-800 text-sm truncate">{p.name}</p>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {p.category.icon} {p.category.name}
                    </p>
                    <p className="text-sm font-semibold text-orange-500 mt-0.5">{formatPrice(p.price)}</p>
                  </div>
                  <button
                    onClick={() => toggle(p.id)}
                    disabled={toggling === p.id}
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    {toggling === p.id ? "..." : "+ เพิ่ม"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
