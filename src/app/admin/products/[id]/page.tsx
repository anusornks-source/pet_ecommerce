"use client";

import { useEffect, useState, useMemo } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import ProductForm from "../ProductForm";
import { useShopAdmin } from "@/context/ShopAdminContext";
import { useLocale } from "@/context/LocaleContext";
import toast from "react-hot-toast";

interface SupplierForAdd {
  id: string;
  name: string;
  nameTh: string | null;
  imageUrl: string | null;
  tel: string | null;
  email: string | null;
  contact: string | null;
  website: string | null;
  note: string | null;
  _count: { products: number };
}

interface PackSummary {
  id: string;
  lang: string;
  hooks: string[];
  createdAt: string;
}

interface ProductVariant {
  id: string;
  size: string | null;
  color: string | null;
  price: number;
  stock: number;
  sku: string | null;
  cjVid: string | null;
  cjStock: number | null;
  variantImage: string | null;
  attributes: { name: string; value: string }[] | null;
  active: boolean;
  fulfillmentMethod: string | null;
}

interface Product {
  id: string;
  shopId: string;
  name: string;
  name_th: string | null;
  description: string;
  description_th: string | null;
  shortDescription: string | null;
  shortDescription_th: string | null;
  sourceDescription: string | null;
  price: number;
  normalPrice: number | null;
  stock: number;
  images: string[];
  categoryId: string;
  petTypeId: string | null;
  active: boolean;
  featured: boolean;
  deliveryDays: number;
  warehouseCountry: string | null;
  variants: ProductVariant[];
  tags: { id: string }[];
  source: string | null;
  sourceData: object | null;
  fulfillmentMethod: string;
}

export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { activeShop, shops } = useShopAdmin();
  const { t } = useLocale();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [togglingCJ, setTogglingCJ] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [addingAll, setAddingAll] = useState(false);
  const [packs, setPacks] = useState<PackSummary[]>([]);
  const [packsLoading, setPacksLoading] = useState(true);
  const [supplierLinks, setSupplierLinks] = useState<{ id: string; supplierPrice: number | null; supplier: { id: string; name: string; nameTh: string | null; imageUrl: string | null; tel: string | null; email: string | null; contact: string | null } }[]>([]);
  const [suppliersLoading, setSuppliersLoading] = useState(true);
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [allSuppliers, setAllSuppliers] = useState<SupplierForAdd[]>([]);
  const [addSupplierSearch, setAddSupplierSearch] = useState("");
  const [addingSupplierId, setAddingSupplierId] = useState<string | null>(null);
  const [removingSupplierId, setRemovingSupplierId] = useState<string | null>(null);
  const [editingPriceLinkId, setEditingPriceLinkId] = useState<string | null>(null);
  const [editPriceValue, setEditPriceValue] = useState("");

  const handleDuplicate = async () => {
    if (!product) return;
    if (!confirm(`คัดลอกสินค้า "${product.name}"?\nสินค้าใหม่จะถูกบันทึกเป็น draft`)) return;
    setDuplicating(true);
    try {
      const res = await fetch(`/api/admin/products/${id}/duplicate`, { method: "POST" });
      const d = await res.json();
      if (d.success) {
        toast.success("คัดลอกสินค้าแล้ว");
        router.push(`/admin/products/${d.data.id}`);
      } else {
        toast.error(d.error ?? "เกิดข้อผิดพลาด");
      }
    } catch {
      toast.error("ไม่สามารถคัดลอกได้");
    } finally {
      setDuplicating(false);
    }
  };

  const handleSyncStock = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`/api/admin/products/${id}/sync-stock`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success(`อัปเดตสต็อกแล้ว ${data.data.updated}/${data.data.total} variants`);
        // Reload page to show updated stock
        window.location.reload();
      } else {
        toast.error(data.error || "เกิดข้อผิดพลาด");
      }
    } catch {
      toast.error("ไม่สามารถ sync ได้");
    } finally {
      setSyncing(false);
    }
  };

  const handleAddAllToMarketingAssets = async () => {
    if (!product) return;
    setAddingAll(true);
    try {
      const res = await fetch(`/api/admin/products/${id}/add-images-to-marketing-assets`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success(data.data.created > 0 ? `เพิ่ม ${data.data.created} รูปใน marketing assets แล้ว` : "รูปทั้งหมดอยู่ใน marketing assets แล้ว");
      } else {
        toast.error(data.error ?? "เกิดข้อผิดพลาด");
      }
    } catch {
      toast.error("ไม่สามารถเพิ่มได้");
    } finally {
      setAddingAll(false);
    }
  };

  const handleToggleCJ = async () => {
    if (!product) return;
    const isLinked = product.source === "CJ";
    const action = isLinked ? "unlink" : "relink";
    const msg = isLinked
      ? "ยืนยันยกเลิกเชื่อม CJ? สินค้านี้จะถูกจัดการเป็นสต็อกเอง"
      : "เชื่อม CJ ใหม่? ระบบจะ restore cjVid จากข้อมูลเดิม";
    if (!confirm(msg)) return;
    setTogglingCJ(true);
    try {
      const res = await fetch(`/api/admin/products/${id}/toggle-cj`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(action === "unlink" ? "ยกเลิกเชื่อม CJ แล้ว" : "เชื่อม CJ ใหม่แล้ว");
        window.location.reload();
      } else {
        toast.error(data.error || "เกิดข้อผิดพลาด");
      }
    } catch {
      toast.error("ไม่สามารถดำเนินการได้");
    } finally {
      setTogglingCJ(false);
    }
  };

  useEffect(() => {
    fetch(`/api/admin/products/${id}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setProduct(d.data); })
      .finally(() => setLoading(false));
    fetch(`/api/admin/automation/marketing-packs?productId=${id}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setPacks(d.data); })
      .finally(() => setPacksLoading(false));
    fetch(`/api/admin/product-suppliers?productId=${id}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setSupplierLinks(d.data); })
      .finally(() => setSuppliersLoading(false));
  }, [id]);

  const loadSuppliersForAdd = () => {
    fetch("/api/admin/suppliers")
      .then((r) => r.json())
      .then((d) => { if (d.success) setAllSuppliers(d.data); });
  };

  const availableSuppliers = useMemo(() => {
    const notLinked = allSuppliers.filter((s) => !supplierLinks.some((l) => l.supplier.id === s.id));
    if (!addSupplierSearch.trim()) return notLinked;
    const q = addSupplierSearch.trim().toLowerCase();
    return notLinked.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.nameTh?.toLowerCase().includes(q) ?? false) ||
        (s.contact?.toLowerCase().includes(q) ?? false) ||
        (s.website?.toLowerCase().includes(q) ?? false)
    );
  }, [allSuppliers, supplierLinks, addSupplierSearch]);

  const handleAddSupplier = async (supplierId: string) => {
    setAddingSupplierId(supplierId);
    try {
      const res = await fetch(`/api/admin/suppliers/${supplierId}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: id }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Added supplier");
        setShowAddSupplier(false);
        setAddSupplierSearch("");
        fetch(`/api/admin/product-suppliers?productId=${id}`)
          .then((r) => r.json())
          .then((d) => { if (d.success) setSupplierLinks(d.data); });
      } else {
        toast.error(data.error ?? "Failed");
      }
    } catch {
      toast.error("Failed");
    } finally {
      setAddingSupplierId(null);
    }
  };

  const handleRemoveSupplier = async (supplierId: string, supplierName: string) => {
    if (!confirm(`ยืนยันลบ ${supplierName} ออกจากสินค้านี้?`)) return;
    setRemovingSupplierId(supplierId);
    try {
      const res = await fetch(`/api/admin/suppliers/${supplierId}/products/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("ลบ supplier ออกจากสินค้าแล้ว");
        setSupplierLinks((prev) => prev.filter((l) => l.supplier.id !== supplierId));
      } else {
        toast.error(data.error ?? "ลบไม่สำเร็จ");
      }
    } catch {
      toast.error("ลบไม่สำเร็จ");
    } finally {
      setRemovingSupplierId(null);
    }
  };

  const startEditSupplierPrice = (link: { id: string; supplierPrice: number | null; supplier: { id: string } }) => {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-stone-400 text-sm">กำลังโหลด...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-16 text-stone-400">ไม่พบสินค้า</div>
    );
  }

  const productShop = shops.find((s) => s.id === product.shopId);
  const isDifferentShop = activeShop && product.shopId !== activeShop.id;

  return (
    <div>
      {isDifferentShop && productShop && (
        <div className="mb-4 flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
          <span>⚠️</span>
          <span>กำลังแก้ไขสินค้าของร้าน <strong>{productShop.name}</strong> (ร้านที่ active อยู่คือ {activeShop.name})</span>
        </div>
      )}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-stone-800">{t("editProduct", "adminPages")}</h1>
            <Link
              href={`/admin/products/${id}/view`}
              className="text-sm text-stone-500 hover:text-stone-800 border border-stone-200 rounded-xl px-3 py-1.5 transition-colors"
            >
              ดูรายละเอียด →
            </Link>
            <button
              onClick={handleAddAllToMarketingAssets}
              disabled={addingAll || (product.images.length === 0 && product.variants.every((v) => !v.variantImage))}
              className="text-sm text-orange-600 hover:text-orange-700 border border-orange-200 rounded-xl px-3 py-1.5 transition-colors disabled:opacity-50"
            >
              {addingAll ? "กำลังเพิ่ม..." : "เพิ่มรูปเข้า Marketing Assets"}
            </button>
          </div>
          <p className="text-stone-500 text-sm mt-1">
            {product.name}
            {productShop && <span className="ml-2 text-xs px-2 py-0.5 bg-stone-100 text-stone-500 rounded-full">{productShop.name}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleDuplicate}
            disabled={duplicating}
            className="flex items-center gap-1.5 bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-600 px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
          >
            {duplicating ? "กำลังคัดลอก..." : "📋 คัดลอกสินค้า"}
          </button>
          <a
            href={`/api/admin/products/${id}/share-card`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            🖼️ Share Card
          </a>
          {product.variants.some((v) => v.cjVid) && (
            <button
              onClick={handleSyncStock}
              disabled={syncing}
              className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            >
              {syncing ? "กำลัง Sync..." : "🔄 Sync Stock จาก CJ"}
            </button>
          )}
          {product.sourceData && (
            <button
              onClick={handleToggleCJ}
              disabled={togglingCJ}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition-colors disabled:opacity-50 ${
                product.source === "CJ"
                  ? "bg-red-50 hover:bg-red-100 border-red-200 text-red-600"
                  : "bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
              }`}
            >
              {togglingCJ ? "..." : product.source === "CJ" ? "🔗 ยกเลิกเชื่อม CJ" : "🔗 เชื่อม CJ ใหม่"}
            </button>
          )}
        </div>
      </div>
      {/* Marketing Packs section */}
      <div className="bg-white rounded-2xl border border-stone-100 p-6 max-w-6xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-stone-800">Marketing Packs</h2>
            <p className="text-xs text-stone-400 mt-0.5">{packsLoading ? "..." : `${packs.length} pack`}</p>
          </div>
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
        </div>
        {packsLoading ? (
          <div className="text-xs text-stone-400">กำลังโหลด...</div>
        ) : packs.length === 0 ? (
          <div className="text-xs text-stone-400 py-2">ยังไม่มี Marketing Pack — สร้างใหม่ได้เลย</div>
        ) : (
          <div className="space-y-2">
            {packs.map((pack) => (
              <Link
                key={pack.id}
                href={`/admin/automation/marketing-packs/${pack.id}`}
                className="flex items-center gap-3 p-3 rounded-xl border border-stone-100 hover:border-orange-200 hover:bg-orange-50 transition-colors group"
              >
                <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-stone-100 text-stone-500 group-hover:bg-orange-100 group-hover:text-orange-600">{pack.lang}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-stone-600 truncate">{pack.hooks[0] ?? "—"}</p>
                </div>
                <span className="text-[11px] text-stone-400 shrink-0">
                  {new Date(pack.createdAt).toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                </span>
                <span className="text-stone-300 group-hover:text-orange-400 text-xs">→</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Suppliers section */}
      <div className="bg-white rounded-2xl border border-stone-100 p-6 max-w-6xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-stone-800">Suppliers</h2>
            <p className="text-xs text-stone-400 mt-0.5">
              {suppliersLoading ? "..." : `Available from ${supplierLinks.length} supplier(s)`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setShowAddSupplier(true); loadSuppliersForAdd(); }}
            className="text-xs px-3 py-1.5 rounded-lg border border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors font-medium"
          >
            + Add Supplier
          </button>
        </div>
        {suppliersLoading ? (
          <div className="text-xs text-stone-400">กำลังโหลด...</div>
        ) : supplierLinks.length === 0 ? (
          <div className="text-xs text-stone-400 py-2">
            No suppliers yet — go to Suppliers page to map products
          </div>
        ) : (
          <div className="space-y-2">
            {supplierLinks.map((link) => (
              <div
                key={link.id}
                className="flex flex-wrap items-center gap-3 p-3 rounded-xl border border-stone-100 hover:border-teal-200 hover:bg-teal-50 transition-colors group"
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
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); handleRemoveSupplier(link.supplier.id, link.supplier.nameTh ?? link.supplier.name); }}
                  disabled={removingSupplierId === link.supplier.id}
                  className="text-xs px-2.5 py-1 rounded-lg text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors disabled:opacity-50 shrink-0"
                >
                  {removingSupplierId === link.supplier.id ? "กำลังลบ..." : "Remove"}
                </button>
              </div>
            ))}
          </div>
        )}

        {showAddSupplier && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => { setShowAddSupplier(false); setAddSupplierSearch(""); }}>
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="p-4 border-b border-stone-100 flex items-center justify-between shrink-0">
                <h3 className="font-semibold text-stone-800">Add Supplier</h3>
                <button type="button" onClick={() => { setShowAddSupplier(false); setAddSupplierSearch(""); }} className="w-8 h-8 rounded-lg hover:bg-stone-100 text-stone-500 flex items-center justify-center">✕</button>
              </div>
              <div className="p-4 border-b border-stone-100 shrink-0">
                <input
                  type="text"
                  value={addSupplierSearch}
                  onChange={(e) => setAddSupplierSearch(e.target.value)}
                  placeholder="ค้นหาชื่อ, ชื่อไทย, ติดต่อ, เว็บไซต์..."
                  className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300 placeholder:text-stone-400"
                />
              </div>
              <div className="p-4 overflow-y-auto flex-1 min-h-0">
                {allSuppliers.length === 0 ? (
                  <p className="text-sm text-stone-400">No suppliers. Create one in Suppliers page.</p>
                ) : availableSuppliers.length === 0 ? (
                  <p className="text-sm text-stone-400">
                    {addSupplierSearch.trim() ? "ไม่พบ supplier ตามคำค้น" : "Product is already linked to all suppliers."}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {availableSuppliers.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleAddSupplier(s.id)}
                        disabled={addingSupplierId === s.id}
                        className="w-full text-left flex items-center gap-3 p-3 rounded-xl border border-stone-100 hover:border-teal-200 hover:bg-teal-50/50 transition-colors disabled:opacity-50 group"
                      >
                        {s.imageUrl ? (
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-stone-100 shrink-0">
                            <Image src={s.imageUrl} alt="" fill className="object-cover" sizes="48px" />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-stone-100 flex items-center justify-center text-stone-400 text-lg shrink-0">
                            🏭
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-stone-800">
                            {s.name}
                            {s.nameTh && <span className="text-stone-500 font-normal ml-1">({s.nameTh})</span>}
                          </div>
                          {(s.tel || s.email || s.website) && (
                            <p className="text-xs text-stone-500 mt-0.5 truncate">
                              {[s.tel && `📞 ${s.tel}`, s.email && `✉️ ${s.email}`, s.website].filter(Boolean).join(" · ")}
                            </p>
                          )}
                          <p className="text-xs text-stone-400 mt-0.5">{s._count.products} สินค้า</p>
                        </div>
                        <span className="text-teal-600 text-sm font-medium group-hover:text-teal-700 shrink-0">
                          {addingSupplierId === s.id ? "Adding..." : "+ Add"}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-stone-100 p-6 max-w-6xl">
        <ProductForm
          productId={id}
          productShopId={product.shopId}
          initialData={{
            name: product.name,
            name_th: product.name_th ?? "",
            description: product.description,
            description_th: product.description_th ?? "",
            shortDescription: product.shortDescription ?? "",
            shortDescription_th: product.shortDescription_th ?? "",
            sourceDescription: product.sourceDescription ?? "",
            price: product.price.toString(),
            normalPrice: product.normalPrice != null ? product.normalPrice.toString() : "",
            stock: product.stock.toString(),
            images: product.images.join(", "),
            categoryId: product.categoryId,
            petTypeId: product.petTypeId || "",
            active: product.active,
            featured: product.featured,
            deliveryDays: product.deliveryDays.toString(),
            warehouseCountry: product.warehouseCountry ?? "",
            fulfillmentMethod: product.fulfillmentMethod ?? "SELF",
            variants: product.variants.map((v) => ({
              id: v.id,
              size: v.size ?? "",
              color: v.color ?? "",
              price: v.price.toString(),
              stock: v.stock.toString(),
              sku: v.sku ?? "",
              cjVid: v.cjVid ?? "",
              cjStock: v.cjStock ?? null,
              variantImage: v.variantImage ?? "",
              attributes: v.attributes ?? null,
              active: v.active,
              fulfillmentMethod: v.fulfillmentMethod ?? null,
            })),
            tagIds: product.tags.map((t) => t.id),
          }}
        />
      </div>
    </div>
  );
}
