"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useShopAdmin } from "@/context/ShopAdminContext";
import { useLocale } from "@/context/LocaleContext";
import { ProductValidationStatus } from "@/generated/prisma/enums";

const STATUS_COLORS: Record<string, string> = {
  [ProductValidationStatus.Lead]: "bg-stone-100 text-stone-700",
  [ProductValidationStatus.Qualified]: "bg-amber-100 text-amber-700",
  [ProductValidationStatus.Approved]: "bg-green-100 text-green-700",
  [ProductValidationStatus.Rejected]: "bg-red-100 text-red-700",
};

const STATUSES = Object.values(ProductValidationStatus);

const iconCls = "inline-flex items-center justify-center w-5 h-5 rounded border transition-all duration-150 hover:scale-110";

function DraggableCard({
  product,
  status,
  productImage,
  onDelete,
  deletingId,
}: {
  product: Product;
  status: string;
  productImage: (p: Product) => string | null;
  onDelete: (id: string, name: string) => void;
  deletingId: string | null;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `product-${product.id}`,
    data: { productId: product.id, fromStatus: status },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`bg-white rounded-md border border-stone-200 p-2.5 shadow-sm cursor-grab active:cursor-grabbing flex flex-col gap-2 min-h-[100px] w-full ${isDragging ? "opacity-0" : ""}`}
    >
      <Link href={`/admin/products/${product.id}/view`} className="flex gap-3 items-start min-w-0 flex-1" onClick={(e) => e.stopPropagation()}>
        <div className="relative w-24 h-24 shrink-0 rounded-lg overflow-hidden bg-stone-100">
          {productImage(product) ? (
            <Image src={productImage(product)!} alt="" fill className="object-cover" sizes="96px" />
          ) : (
            <div className="flex items-center justify-center h-full text-stone-300 text-xl">📦</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-stone-800 line-clamp-3">{product.name_th || product.name}</p>
          <p className="text-xs text-stone-500 mt-0.5">฿{product.price.toLocaleString("th-TH")}</p>
        </div>
      </Link>
      <div className="flex items-center justify-end gap-0.5 pt-0.5 border-t border-stone-100" onClick={(e) => e.stopPropagation()}>
        <Link
          href={`/admin/automation/marketing-packs?productId=${product.id}`}
          className={`${iconCls} border-stone-200 text-stone-500 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600`}
          title="Marketing Packs"
        >
          <span className="text-[10px]">🎯</span>
        </Link>
        <Link
          href={`/admin/products/${product.id}/view`}
          className={`${iconCls} border-stone-200 text-stone-500 hover:bg-stone-50`}
          title="ดู"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        </Link>
        <Link
          href={`/admin/products/${product.id}`}
          className={`${iconCls} border-stone-200 text-stone-500 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600`}
          title="แก้ไข"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
        </Link>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(product.id, product.name_th || product.name); }}
          disabled={deletingId === product.id}
          className={`${iconCls} border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50`}
          title="ลบ"
        >
          {deletingId === product.id ? (
            <span className="text-[8px]">...</span>
          ) : (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          )}
        </button>
      </div>
    </div>
  );
}

function DroppableColumn({
  status,
  children,
}: {
  status: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[100px] transition-colors ${isOver ? "bg-orange-50 ring-2 ring-orange-200 ring-inset rounded-lg" : ""}`}
    >
      {children}
    </div>
  );
}

interface Tag {
  id: string;
  name: string;
  color: string;
  icon: string | null;
}

interface Product {
  id: string;
  name: string;
  name_th: string | null;
  price: number;
  stock?: number;
  images: string[];
  validationStatus: string;
  featured?: boolean;
  active?: boolean;
  createdAt?: string;
  source?: string | null;
  sourceData?: object | null;
  fulfillmentMethod?: string;
  category: { id: string; name: string };
  shop: { id: string; name: string } | null;
  petType?: { id: string; name: string; slug: string; icon: string | null } | null;
  tags?: Tag[];
  _count?: { marketingPacks: number };
}

interface Category {
  id: string;
  name: string;
}

const TAG_COLORS: Record<string, string> = {
  orange: "bg-orange-100 text-orange-700",
  red: "bg-red-100 text-red-700",
  green: "bg-green-100 text-green-700",
  blue: "bg-blue-100 text-blue-700",
  purple: "bg-purple-100 text-purple-700",
  yellow: "bg-yellow-100 text-yellow-800",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("th-TH", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function ProductValidationPage() {
  const { activeShop, shops, isAdmin } = useShopAdmin();
  const { t } = useLocale();
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [shopFilter, setShopFilter] = useState("");
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [kanbanData, setKanbanData] = useState<Record<string, Product[]>>({});
  const [kanbanTotals, setKanbanTotals] = useState<Record<string, number>>({});
  const [kanbanPages, setKanbanPages] = useState<Record<string, number>>({});
  const [loadingMore, setLoadingMore] = useState<string | null>(null);
  const [listProducts, setListProducts] = useState<Product[]>([]);
  const [listTotal, setListTotal] = useState(0);
  const [listPage, setListPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [bulkIds, setBulkIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulking, setBulking] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const resolvedShopId = shopFilter || (activeShop?.id ?? "");

  const fetchStats = useCallback(async () => {
    const params = new URLSearchParams();
    if (resolvedShopId) params.set("shopId", resolvedShopId);
    const res = await fetch(`/api/admin/products/validation-stats?${params}`);
    const data = await res.json();
    if (data.success) setStats(data.data);
  }, [resolvedShopId]);

  const fetchKanban = useCallback(async (appendStatus?: string, appendPage?: number) => {
    if (!appendStatus) setLoading(true);
    const baseParams = new URLSearchParams();
    if (resolvedShopId) baseParams.set("shopId", resolvedShopId);
    if (search) baseParams.set("search", search);
    if (filterCategory) baseParams.set("categoryId", filterCategory);
    baseParams.set("sort", "newest");
    if (appendStatus && appendPage) {
      baseParams.set("validationStatus", appendStatus);
      baseParams.set("page", String(appendPage));
      setLoadingMore(appendStatus);
      const res = await fetch(`/api/admin/products?${baseParams}`);
      const data = await res.json();
      setLoadingMore(null);
      if (data.success) {
        setKanbanData((prev) => ({
          ...prev,
          [appendStatus]: [...(prev[appendStatus] ?? []), ...data.data],
        }));
        setKanbanTotals((prev) => ({ ...prev, [appendStatus]: data.total }));
        setKanbanPages((prev) => ({ ...prev, [appendStatus]: appendPage }));
      }
      return;
    }
    baseParams.set("page", "1");
    const results = await Promise.all(
      STATUSES.map((status) => {
        const p = new URLSearchParams(baseParams);
        p.set("validationStatus", status);
        return fetch(`/api/admin/products?${p}`).then((r) => r.json());
      })
    );
    const byStatus: Record<string, Product[]> = {};
    const totals: Record<string, number> = {};
    const pages: Record<string, number> = {};
    STATUSES.forEach((s, i) => {
      byStatus[s] = results[i]?.success ? results[i].data : [];
      totals[s] = results[i]?.success ? results[i].total ?? 0 : 0;
      pages[s] = 1;
    });
    setKanbanData(byStatus);
    setKanbanTotals(totals);
    setKanbanPages(pages);
    setLoading(false);
  }, [resolvedShopId, search, filterCategory]);

  const fetchList = useCallback(async (p: number) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), validationStatus: filterStatus });
    if (resolvedShopId) params.set("shopId", resolvedShopId);
    if (search) params.set("search", search);
    if (filterCategory) params.set("categoryId", filterCategory);
    params.set("sort", "newest");
    const res = await fetch(`/api/admin/products?${params}`);
    const data = await res.json();
    if (data.success) {
      setListProducts(data.data);
      setListTotal(data.total);
    }
    setLoading(false);
  }, [resolvedShopId, search, filterCategory, filterStatus]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (viewMode === "kanban") fetchKanban();
    else fetchList(listPage);
  }, [viewMode, listPage, fetchKanban, fetchList]);

  useEffect(() => {
    const shopId = shopFilter && shopFilter !== "all" ? shopFilter : activeShop?.id;
    const url = shopId ? `/api/admin/shops/${shopId}/categories` : "/api/admin/categories";
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const list = shopId ? d.data.filter((c: { enabled?: boolean }) => c.enabled !== false) : d.data;
          setCategories(list);
        }
      });
  }, [shopFilter, activeShop?.id]);

  const handleChangeStatus = async (productId: string, newStatus: string, skipRefetch?: boolean) => {
    setUpdatingId(productId);
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ validationStatus: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("เปลี่ยนสถานะแล้ว");
        fetchStats();
        if (!skipRefetch) {
          if (viewMode === "kanban") fetchKanban();
          else fetchList(listPage);
        }
      } else {
        toast.error(data.error || "เกิดข้อผิดพลาด");
        if (viewMode === "kanban") fetchKanban();
      }
    } catch {
      toast.error("เกิดข้อผิดพลาด");
      if (viewMode === "kanban") fetchKanban();
    } finally {
      setUpdatingId(null);
    }
  };

  const handleBulkChange = async () => {
    if (bulkIds.size === 0 || !bulkStatus) return;
    setBulking(true);
    try {
      const res = await fetch("/api/admin/products/bulk-validation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: Array.from(bulkIds), validationStatus: bulkStatus }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`เปลี่ยนสถานะ ${data.data.updated} รายการแล้ว`);
        setBulkIds(new Set());
        setBulkStatus("");
        fetchStats();
        fetchList(listPage);
      } else {
        toast.error(data.error || "เกิดข้อผิดพลาด");
      }
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setBulking(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`ลบสินค้า "${name}" ใช่หรือไม่?`)) return;
    setDeletingId(id);
    const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      toast.success("ลบสินค้าแล้ว");
      const foundStatus = STATUSES.find((s) => (kanbanData[s] ?? []).some((p) => p.id === id));
      if (foundStatus) {
        setKanbanData((prev) => ({
          ...prev,
          [foundStatus]: (prev[foundStatus] ?? []).filter((p) => p.id !== id),
        }));
        setKanbanTotals((t) => ({ ...t, [foundStatus]: Math.max(0, (t[foundStatus] ?? 0) - 1) }));
      }
      fetchStats();
      if (viewMode === "list") fetchList(listPage);
    } else {
      toast.error(data.error || "เกิดข้อผิดพลาด");
    }
    setDeletingId(null);
  };

  const handleToggleActive = async (product: Product) => {
    setTogglingId(product.id);
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !(product.active ?? true) }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success((product.active ?? true) ? "ซ่อนแล้ว" : "เผยแพร่แล้ว");
        setListProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, active: !(p.active ?? true) } : p));
      } else {
        toast.error(data.error || "เกิดข้อผิดพลาด");
      }
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setTogglingId(null);
    }
  };

  const handleToggleFeatured = async (product: Product) => {
    setTogglingId(product.id);
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featured: !(product.featured ?? false) }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success((product.featured ?? false) ? "ยกเลิกแนะนำแล้ว" : "ตั้งเป็นแนะนำแล้ว");
        setListProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, featured: !(p.featured ?? false) } : p));
      } else {
        toast.error(data.error || "เกิดข้อผิดพลาด");
      }
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setTogglingId(null);
    }
  };

  const toggleBulk = (id: string) => {
    setBulkIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleKanbanDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleKanbanDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over || !(STATUSES as readonly string[]).includes(String(over.id))) return;
    const productId = (active.data.current as { productId?: string })?.productId;
    const fromStatus = (active.data.current as { fromStatus?: string })?.fromStatus;
    const toStatus = String(over.id);
    if (!productId || !fromStatus || fromStatus === toStatus) return;
    if (fromStatus === "Approved" && toStatus !== "Approved") {
      if (!confirm("ยืนยันการย้ายออกจาก Approved? สินค้าจะไม่แสดงในหน้าร้าน")) return;
    }
    const product = (kanbanData[fromStatus] ?? []).find((p) => p.id === productId);
    if (!product) return;
    setKanbanData((prev) => ({
      ...prev,
      [fromStatus]: (prev[fromStatus] ?? []).filter((p) => p.id !== productId),
      [toStatus]: [...(prev[toStatus] ?? []), { ...product, validationStatus: toStatus }],
    }));
    setKanbanTotals((prev) => ({
      ...prev,
      [fromStatus]: Math.max(0, (prev[fromStatus] ?? 0) - 1),
      [toStatus]: (prev[toStatus] ?? 0) + 1,
    }));
    handleChangeStatus(productId, toStatus, true);
  };

  const productImage = (p: Product) => {
    const url = p.images?.[0]?.trim();
    return url && (url.startsWith("http") || url.startsWith("/")) ? url : null;
  };

  const activeProduct = activeDragId
    ? (() => {
        const id = activeDragId.replace(/^product-/, "");
        for (const status of STATUSES) {
          const p = (kanbanData[status] ?? []).find((x) => x.id === id);
          if (p) return p;
        }
        return null;
      })()
    : null;

  const pageSize = 50;
  const totalPages = Math.ceil(listTotal / pageSize);

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header: title + controls + stats + filters - compact top bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <h1 className="text-xl font-bold text-stone-800 shrink-0">Product Validation Pipeline</h1>
        {(isAdmin || shops.length > 1) && (
          <select
            value={shopFilter}
            onChange={(e) => setShopFilter(e.target.value)}
            className="border border-stone-200 rounded-lg px-2.5 py-1.5 text-sm bg-white"
          >
            <option value="">{activeShop?.name ?? "เลือกร้าน"}</option>
            {isAdmin && <option value="all">ทั้งหมด</option>}
            {shops.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
        <div className="flex rounded-lg overflow-hidden border border-stone-200 shrink-0">
          <button
            type="button"
            onClick={() => setViewMode("kanban")}
            className={`px-3 py-1.5 text-sm font-medium ${viewMode === "kanban" ? "bg-orange-500 text-white" : "bg-white text-stone-600 hover:bg-stone-50"}`}
          >
            Kanban
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`px-3 py-1.5 text-sm font-medium ${viewMode === "list" ? "bg-orange-500 text-white" : "bg-white text-stone-600 hover:bg-stone-50"}`}
          >
            List
          </button>
        </div>
        <div className="h-5 w-px bg-stone-200 shrink-0" />
        {viewMode === "list" && (
          <button
            type="button"
            onClick={() => { setFilterStatus("all"); setListPage(1); }}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-colors ${
              filterStatus === "all" ? "ring-2 ring-stone-400 bg-stone-200 text-stone-800" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            ทั้งหมด
          </button>
        )}
        {STATUSES.map((status) => (
          viewMode === "list" ? (
            <button
              key={status}
              type="button"
              onClick={() => { setFilterStatus(status); setListPage(1); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-colors ${
                filterStatus === status ? "ring-2 ring-stone-400 " : ""
              } ${STATUS_COLORS[status] ?? "bg-stone-100 text-stone-700"} ${filterStatus !== status ? "hover:opacity-90" : ""}`}
            >
              {status}: {(stats[status] ?? 0).toLocaleString()}
            </button>
          ) : (
            <span
              key={status}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 ${
                STATUS_COLORS[status] ?? "bg-stone-100 text-stone-700"
              }`}
            >
              {status}: {(stats[status] ?? 0).toLocaleString()}
            </span>
          )
        ))}
        <div className="h-5 w-px bg-stone-200 shrink-0" />
        <input
          type="text"
          placeholder="ค้นหาสินค้า..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-stone-200 rounded-lg px-2.5 py-1.5 text-sm min-w-40 focus:outline-none focus:ring-2 focus:ring-orange-200"
        />
        <select
          value={filterCategory}
          onChange={(e) => { setFilterCategory(e.target.value); setListPage(1); }}
          className="border border-stone-200 rounded-lg px-2.5 py-1.5 text-sm bg-white"
        >
          <option value="">หมวดหมู่: ทั้งหมด</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {viewMode === "kanban" ? (
        <DndContext sensors={sensors} onDragStart={handleKanbanDragStart} onDragEnd={handleKanbanDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {STATUSES.map((status) => (
              <div key={status} className="bg-stone-50 rounded-xl border border-stone-200 overflow-hidden">
                <div className={`p-3 font-semibold text-sm ${STATUS_COLORS[status] ?? ""}`}>
                  {status} ({(kanbanData[status] ?? []).length}
                  {(kanbanTotals[status] ?? 0) > (kanbanData[status] ?? []).length ? ` / ${kanbanTotals[status]}` : ""})
                </div>
                <div className="max-h-[calc(100vh-200px)] overflow-y-auto p-2 space-y-1.5">
                  {loading ? (
                    <div className="text-center py-8 text-stone-400 text-sm">กำลังโหลด...</div>
                  ) : (
                    <DroppableColumn status={status}>
                      {(kanbanData[status] ?? []).length === 0 ? (
                        <div className="text-center py-8 text-stone-400 text-sm">ไม่มีรายการ</div>
                      ) : (
                        <>
                          {(kanbanData[status] ?? []).map((p) => (
                            <DraggableCard
                              key={p.id}
                              product={p}
                              status={status}
                              productImage={productImage}
                              onDelete={handleDelete}
                              deletingId={deletingId}
                            />
                          ))}
                          {(kanbanData[status] ?? []).length < (kanbanTotals[status] ?? 0) && (
                            <button
                              type="button"
                              onClick={() => fetchKanban(status, (kanbanPages[status] ?? 1) + 1)}
                              disabled={loadingMore === status}
                              className="w-full py-2 text-sm text-orange-500 border border-orange-200 rounded-lg hover:bg-orange-50 disabled:opacity-50"
                            >
                              {loadingMore === status ? "กำลังโหลด..." : `โหลดเพิ่ม (${(kanbanData[status] ?? []).length}/${kanbanTotals[status]})`}
                            </button>
                          )}
                        </>
                      )}
                    </DroppableColumn>
                  )}
                </div>
              </div>
            ))}
          </div>
          <DragOverlay dropAnimation={null}>
            {activeProduct ? (
              <div className="bg-white rounded-md border-2 border-orange-300 p-2.5 shadow-xl cursor-grabbing flex flex-col gap-2 min-h-[100px] w-[min(280px,90vw)]">
                <div className="flex gap-3 items-start">
                  <div className="relative w-24 h-24 shrink-0 rounded-lg overflow-hidden bg-stone-100">
                    {productImage(activeProduct) ? (
                      <Image src={productImage(activeProduct)!} alt="" fill className="object-cover" sizes="96px" />
                    ) : (
                      <div className="flex items-center justify-center h-full text-stone-300 text-xl">📦</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-stone-800 line-clamp-3">{activeProduct.name_th || activeProduct.name}</p>
                    <p className="text-xs text-stone-500 mt-0.5">฿{activeProduct.price.toLocaleString("th-TH")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-0.5 pt-0.5 border-t border-stone-100">
                  <span className="text-[10px] text-stone-400">🎯 👁 ✏️ 🗑</span>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <>
          {bulkIds.size > 0 && (
            <div className="flex items-center gap-2 mb-4 p-3 bg-orange-50 rounded-xl border border-orange-200">
              <span className="text-sm font-medium">เลือก {bulkIds.size} รายการ</span>
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value)}
                className="border border-stone-200 rounded-lg px-2 py-1 text-sm"
              >
                <option value="">เปลี่ยนเป็น...</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleBulkChange}
                disabled={!bulkStatus || bulking}
                className="px-4 py-1.5 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50"
              >
                {bulking ? "กำลังเปลี่ยน..." : "เปลี่ยน"}
              </button>
              <button
                type="button"
                onClick={() => setBulkIds(new Set())}
                className="text-stone-500 hover:text-stone-700 text-sm"
              >
                ยกเลิก
              </button>
            </div>
          )}
          <div className="bg-white rounded-2xl border border-stone-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50">
                  <th className="text-left px-4 py-3 text-stone-500 font-medium w-10">
                    <input
                      type="checkbox"
                      checked={listProducts.length > 0 && listProducts.every((p) => bulkIds.has(p.id))}
                      onChange={(e) => {
                        if (e.target.checked) setBulkIds(new Set(listProducts.map((p) => p.id)));
                        else setBulkIds(new Set());
                      }}
                    />
                  </th>
                  <th className="text-left px-4 py-3 text-stone-500 font-medium">สินค้า</th>
                  {(isAdmin || shops.length > 1) && (
                    <th className="text-left px-4 py-3 text-stone-500 font-medium hidden lg:table-cell">ร้าน</th>
                  )}
                  <th className="text-left px-4 py-3 text-stone-500 font-medium hidden md:table-cell">หมวดหมู่</th>
                  <th className="text-left px-4 py-3 text-stone-500 font-medium hidden lg:table-cell">ประเภทสัตว์</th>
                  <th className="text-right px-4 py-3 text-stone-500 font-medium">ราคา</th>
                  <th className="text-right px-4 py-3 text-stone-500 font-medium hidden sm:table-cell">สต็อก</th>
                  <th className="text-center px-4 py-3 text-stone-500 font-medium hidden lg:table-cell">แนะนำ</th>
                  <th className="text-center px-4 py-3 text-stone-500 font-medium hidden lg:table-cell">แหล่งที่มา</th>
                  <th className="text-center px-4 py-3 text-stone-500 font-medium hidden xl:table-cell">วันที่สร้าง</th>
                  <th className="text-left px-4 py-3 text-stone-500 font-medium">สถานะ</th>
                  <th className="text-center px-4 py-3 text-stone-500 font-medium">เผยแพร่</th>
                  <th className="text-center px-4 py-3 text-stone-500 font-medium">Marketing</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {loading ? (
                  <tr><td colSpan={14} className="px-4 py-8 text-center text-stone-400">กำลังโหลด...</td></tr>
                ) : listProducts.length === 0 ? (
                  <tr><td colSpan={14} className="px-4 py-8 text-center text-stone-400">ไม่พบข้อมูล</td></tr>
                ) : (
                  listProducts.map((p) => (
                    <tr key={p.id} className={`hover:bg-stone-50 transition-colors ${!(p.active ?? true) ? "opacity-50" : ""}`}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={bulkIds.has(p.id)}
                          onChange={() => toggleBulk(p.id)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-stone-100 shrink-0">
                            {productImage(p) ? (
                              <Image src={productImage(p)!} alt="" fill className="object-cover" sizes="40px" />
                            ) : (
                              <div className="flex items-center justify-center h-full text-stone-300">📦</div>
                            )}
                          </div>
                          <div>
                            <Link href={`/admin/products/${p.id}/view`} className="font-medium text-stone-800 hover:text-orange-600 line-clamp-1">
                              {p.name_th || p.name}
                            </Link>
                            {(p.tags ?? []).length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {(p.tags ?? []).map((tag) => (
                                  <span key={tag.id} className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full ${TAG_COLORS[tag.color] ?? "bg-stone-100 text-stone-600"}`}>
                                    {tag.icon && <span>{tag.icon}</span>}
                                    {tag.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      {(isAdmin || shops.length > 1) && (
                        <td className="px-4 py-3 hidden lg:table-cell text-stone-600 text-xs">{p.shop?.name ?? "—"}</td>
                      )}
                      <td className="px-4 py-3 hidden md:table-cell text-stone-600 text-sm">{p.category?.name ?? "—"}</td>
                      <td className="px-4 py-3 hidden lg:table-cell text-stone-600 text-sm">
                        {p.petType ? `${p.petType.icon ?? ""} ${p.petType.name}` : <span className="text-stone-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-stone-800">฿{p.price.toLocaleString("th-TH")}</td>
                      <td className="px-4 py-3 text-right text-stone-500 hidden sm:table-cell">{p.stock ?? 0}</td>
                      <td className="px-4 py-3 text-center hidden lg:table-cell">
                        <button onClick={() => handleToggleFeatured(p)} disabled={togglingId === p.id} title={(p.featured ?? false) ? "ยกเลิกแนะนำ" : "ตั้งเป็นแนะนำ"} className="hover:scale-125 transition-transform">
                          {(p.featured ?? false) ? <span className="text-orange-400 text-base leading-none">★</span> : <span className="text-stone-300 hover:text-orange-300 text-base leading-none">☆</span>}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center hidden lg:table-cell">
                        {p.fulfillmentMethod === "CJ" ? (
                          <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-600">CJ</span>
                        ) : p.fulfillmentMethod === "SUPPLIER" ? (
                          <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-600">Supplier</span>
                        ) : (
                          <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-500">ส่งเอง</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-stone-400 text-xs hidden xl:table-cell whitespace-nowrap">
                        {p.createdAt ? formatDate(p.createdAt) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={p.validationStatus}
                          disabled={updatingId === p.id}
                          onChange={(e) => {
                            const newStatus = e.target.value;
                            if (p.validationStatus === "Approved" && newStatus !== "Approved") {
                              if (!confirm("ยืนยันการย้ายออกจาก Approved? สินค้าจะไม่แสดงในหน้าร้าน")) return;
                            }
                            handleChangeStatus(p.id, newStatus);
                          }}
                          className={`text-xs px-2 py-1 rounded-lg border ${STATUS_COLORS[p.validationStatus] ?? ""} border-transparent`}
                        >
                          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggleActive(p)}
                          disabled={togglingId === p.id}
                          title={(p.active ?? true) ? "คลิกเพื่อซ่อน" : "คลิกเพื่อเผยแพร่"}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${(p.active ?? true) ? "bg-green-500" : "bg-stone-200"}`}
                        >
                          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${(p.active ?? true) ? "translate-x-4" : "translate-x-0.5"}`} />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Link
                          href={`/admin/automation/marketing-packs?productId=${p.id}`}
                          className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded border transition-colors ${(p._count?.marketingPacks ?? 0) > 0 ? "border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100" : "border-stone-200 text-stone-400 hover:bg-stone-50"}`}
                          title="Marketing Packs"
                        >
                          🎯 {(p._count?.marketingPacks ?? 0) > 0 ? `${p._count?.marketingPacks}+` : "+"}
                        </Link>
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-1">
                          <Link
                            href={`/admin/automation/marketing-packs?productId=${p.id}`}
                            className={`${iconCls} border-stone-200 text-stone-600 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600`}
                            title="Marketing Packs"
                          >
                            <span className="text-xs">🎯</span>
                          </Link>
                          <Link
                            href={`/admin/products/${p.id}/view`}
                            className={`${iconCls} border-stone-200 text-stone-600 hover:bg-stone-50 hover:border-stone-300`}
                            title="ดู"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          </Link>
                          <Link
                            href={`/admin/products/${p.id}`}
                            className={`${iconCls} border-stone-200 text-stone-600 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600`}
                            title="แก้ไข"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDelete(p.id, p.name_th || p.name)}
                            disabled={deletingId === p.id}
                            className={`${iconCls} border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50`}
                            title="ลบ"
                          >
                            {deletingId === p.id ? (
                              <span className="text-[10px]">...</span>
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 p-4 border-t border-stone-100">
                <button
                  type="button"
                  disabled={listPage <= 1}
                  onClick={() => setListPage((p) => p - 1)}
                  className="px-3 py-1 rounded border border-stone-200 disabled:opacity-40 text-sm"
                >
                  ก่อน
                </button>
                <span className="text-sm text-stone-500">หน้า {listPage} / {totalPages}</span>
                <button
                  type="button"
                  disabled={listPage >= totalPages}
                  onClick={() => setListPage((p) => p + 1)}
                  className="px-3 py-1 rounded border border-stone-200 disabled:opacity-40 text-sm"
                >
                  ถัดไป
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
