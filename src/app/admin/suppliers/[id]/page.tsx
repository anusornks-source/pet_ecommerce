"use client";

import { use, useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import { useShopAdmin } from "@/context/ShopAdminContext";

interface ProductLink {
  id: string;
  productId: string;
  supplierSku: string | null;
  supplierUrl: string | null;
  supplierPrice: number | null;
  note: string | null;
  product: {
    id: string;
    name: string;
    name_th: string | null;
    shortDescription: string | null;
    shortDescription_th: string | null;
    cjProductId: string | null;
    images: string[];
    price: number;
    stock: number;
    costPrice: number | null;
  };
}

interface Supplier {
  id: string;
  name: string;
  nameTh: string | null;
  imageUrl: string | null;
  tel: string | null;
  email: string | null;
  contact: string | null;
  website: string | null;
  note: string | null;
  products: ProductLink[];
}

interface ProductOption {
  id: string;
  name: string;
  name_th: string | null;
  images: string[];
}

interface SupplierProductItem {
  id: string;
  name: string;
  name_th: string | null;
  description: string;
  shortDescription: string | null;
  supplierSku: string | null;
  supplierUrl: string | null;
  supplierPrice: number | null;
  images: string[];
  categoryId: string | null;
  petTypeId: string | null;
  productId: string | null;
  category: { id: string; name: string } | null;
  petType: { id: string; name: string } | null;
  product: { id: string; name: string } | null;
}

export default function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { shops: shopList } = useShopAdmin();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [productSearch, setProductSearch] = useState("");
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [addingProductId, setAddingProductId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editPriceValue, setEditPriceValue] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Supplier Products (สินค้าจาก supplier ก่อน import)
  const [supplierProducts, setSupplierProducts] = useState<SupplierProductItem[]>([]);
  const [showAddSp, setShowAddSp] = useState(false);
  const [spForm, setSpForm] = useState({ name: "", name_th: "", description: "", shortDescription: "", supplierSku: "", supplierUrl: "", supplierPrice: "", imagesText: "", categoryId: "", petTypeId: "" });
  const [savingSp, setSavingSp] = useState(false);
  const [importingSpId, setImportingSpId] = useState<string | null>(null);
  const [importModal, setImportModal] = useState<SupplierProductItem | null>(null);
  const [importForm, setImportForm] = useState({ shopId: "", categoryId: "", petTypeId: "", price: "", stock: "0" });
  const [shops, setShops] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [petTypes, setPetTypes] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [deletingSpId, setDeletingSpId] = useState<string | null>(null);

  const loadSupplier = useCallback(() => {
    fetch(`/api/admin/suppliers/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setSupplier(d.data);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    loadSupplier();
  }, [loadSupplier]);

  const loadSupplierProducts = useCallback(() => {
    fetch(`/api/admin/suppliers/${id}/supplier-products`)
      .then((r) => r.json())
      .then((d) => d.success && setSupplierProducts(d.data));
  }, [id]);

  useEffect(() => {
    loadSupplierProducts();
  }, [loadSupplierProducts]);

  useEffect(() => {
    if (shopList?.length) {
      setShops(shopList.map((s) => ({ id: s.id, name: s.name_th ?? s.name })));
    } else {
      fetch("/api/admin/shops")
        .then((r) => r.json())
        .then((d) => d.success && d.data?.length && setShops(d.data.map((s: { id: string; name: string; name_th?: string }) => ({ id: s.id, name: s.name_th ?? s.name }))));
    }
  }, [shopList]);
  useEffect(() => {
    Promise.all([
      fetch("/api/admin/categories").then((r) => r.json()).then((d) => d.success && setCategories(d.data ?? [])),
      fetch("/api/pet-types").then((r) => r.json()).then((d) => d.success && setPetTypes(d.data ?? [])),
    ]);
  }, []);

  const handleAddSupplierProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spForm.name.trim() || !spForm.description.trim()) {
      toast.error("กรุณากรอกชื่อและคำอธิบาย");
      return;
    }
    setSavingSp(true);
    try {
      const images = spForm.imagesText.trim().split(/\s+/).filter(Boolean);
      const res = await fetch(`/api/admin/suppliers/${id}/supplier-products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...spForm,
          supplierPrice: spForm.supplierPrice ? parseFloat(spForm.supplierPrice) : null,
          images,
          categoryId: spForm.categoryId || null,
          petTypeId: spForm.petTypeId || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("เพิ่มสินค้าแล้ว");
        setSpForm({ name: "", name_th: "", description: "", shortDescription: "", supplierSku: "", supplierUrl: "", supplierPrice: "", imagesText: "", categoryId: "", petTypeId: "" });
        setShowAddSp(false);
        loadSupplierProducts();
      } else {
        toast.error(data.error || "เพิ่มไม่สำเร็จ");
      }
    } finally {
      setSavingSp(false);
    }
  };

  const handleDeleteSupplierProduct = async (spId: string) => {
    if (!confirm("ลบสินค้านี้?")) return;
    setDeletingSpId(spId);
    try {
      const res = await fetch(`/api/admin/suppliers/${id}/supplier-products/${spId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("ลบแล้ว");
        loadSupplierProducts();
      } else {
        toast.error(data.error || "ลบไม่สำเร็จ");
      }
    } finally {
      setDeletingSpId(null);
    }
  };

  const handleImportSupplierProduct = async () => {
    if (!importModal) return;
    if (!importForm.shopId || !importForm.categoryId) {
      toast.error("กรุณาเลือกร้านและหมวดหมู่");
      return;
    }
    setImportingSpId(importModal.id);
    try {
      const res = await fetch(`/api/admin/suppliers/${id}/supplier-products/${importModal.id}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId: importForm.shopId,
          categoryId: importForm.categoryId,
          petTypeId: importForm.petTypeId || null,
          price: importForm.price ? parseFloat(importForm.price) : null,
          stock: importForm.stock ? parseInt(importForm.stock) : null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Import เป็น Product แล้ว");
        setImportModal(null);
        setImportForm({ shopId: "", categoryId: "", petTypeId: "", price: "", stock: "0" });
        loadSupplierProducts();
        loadSupplier();
      } else {
        toast.error(data.error || "Import ไม่สำเร็จ");
      }
    } finally {
      setImportingSpId(null);
    }
  };

  const searchProducts = (q: string) => {
    setProductSearch(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!q.trim()) {
      setProductOptions([]);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      const res = await fetch(
        `/api/admin/products?search=${encodeURIComponent(q)}&nameOnly=true&limit=20`
      );
      const data = await res.json();
      const list = data.data ?? data.products ?? [];
      setProductOptions(list);
    }, 300);
  };

  const handleAddProduct = async (productId: string) => {
    setAddingProductId(productId);
    try {
      const res = await fetch(`/api/admin/suppliers/${id}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("เพิ่มสินค้าแล้ว");
        setProductSearch("");
        setProductOptions([]);
        setShowAddProduct(false);
        loadSupplier();
      } else {
        toast.error(data.error || "เพิ่มไม่สำเร็จ");
      }
    } finally {
      setAddingProductId(null);
    }
  };

  const handleRemoveProduct = async (linkId: string, productId: string) => {
    if (!confirm("Remove this product from supplier?")) return;
    setRemovingId(linkId);
    try {
      const res = await fetch(
        `/api/admin/suppliers/${id}/products/${productId}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (data.success) {
        toast.success("เอาออกแล้ว");
        loadSupplier();
      } else {
        toast.error(data.error || "เอาออกไม่สำเร็จ");
      }
    } finally {
      setRemovingId(null);
    }
  };

  const startEditPrice = (link: ProductLink) => {
    setEditingPriceId(link.id);
    setEditPriceValue(link.supplierPrice != null ? String(link.supplierPrice) : "");
  };

  const handleSaveSupplierPrice = async (productId: string) => {
    if (!editingPriceId) return;
    const num = editPriceValue.trim() ? parseFloat(editPriceValue) : null;
    if (editPriceValue.trim() && (isNaN(num!) || num! < 0)) {
      toast.error("กรุณากรอกราคาที่ถูกต้อง");
      return;
    }
    const savedValue = num;
    setEditingPriceId(null);
    setEditPriceValue("");
    try {
      const res = await fetch(`/api/admin/suppliers/${id}/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierPrice: num }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        toast.success("บันทึกราคาแล้ว");
        setSupplier((prev) =>
          prev
            ? {
                ...prev,
                products: prev.products.map((p) =>
                  p.productId === productId ? { ...p, supplierPrice: savedValue } : p
                ),
              }
            : null
        );
      } else {
        toast.error(data.error || "บันทึกไม่สำเร็จ");
      }
    } catch (err) {
      toast.error("เกิดข้อผิดพลาด");
    }
  };

  const linkedProductIds = new Set(supplier?.products.map((p) => p.productId) ?? []);

  if (loading || !supplier) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center py-16 text-stone-400">
          {loading ? "Loading..." : "Supplier not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/suppliers"
          className="text-sm text-stone-500 hover:text-stone-700"
        >
          ← กลับ
        </Link>
      </div>

      <div className="bg-white border border-stone-200 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          {supplier.imageUrl ? (
            <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-stone-100 shrink-0">
              <Image src={supplier.imageUrl} alt="" fill className="object-cover" sizes="80px" />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-xl bg-stone-100 flex items-center justify-center text-3xl shrink-0">
              🏭
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-stone-800">{supplier.name}</h1>
            {supplier.nameTh && (
              <p className="text-sm text-stone-500 mt-0.5">{supplier.nameTh}</p>
            )}
          </div>
        </div>
        {(supplier.tel || supplier.email) && (
          <div className="flex flex-wrap gap-4 mt-4 text-sm text-stone-600">
            {supplier.tel && (
              <span>📞 {supplier.tel}</span>
            )}
            {supplier.email && (
              <a href={`mailto:${supplier.email}`} className="text-teal-600 hover:underline">
                ✉️ {supplier.email}
              </a>
            )}
          </div>
        )}
        {supplier.contact && (
          <p className="text-sm text-stone-600 mt-4 whitespace-pre-wrap">
            {supplier.contact}
          </p>
        )}
        {supplier.website && (
          <a
            href={supplier.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-teal-600 hover:underline mt-2 block"
          >
            {supplier.website}
          </a>
        )}
        {supplier.note && (
          <p className="text-sm text-stone-500 mt-2">{supplier.note}</p>
        )}
      </div>

      <div className="bg-white border border-stone-200 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-stone-800">Products available from this supplier</h2>
          <button
            onClick={() => setShowAddProduct(!showAddProduct)}
            className="text-sm px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-600 text-white font-medium"
          >
            {showAddProduct ? "ยกเลิก" : "+ เพิ่มสินค้า"}
          </button>
        </div>

        {showAddProduct && (
          <div className="mb-6 p-4 bg-stone-50 rounded-xl space-y-2">
            <label className="block text-xs font-semibold text-stone-600">
              ค้นหาสินค้า
            </label>
            <input
              value={productSearch}
              onChange={(e) => searchProducts(e.target.value)}
              placeholder="พิมพ์ชื่อสินค้า..."
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
            />
            {productOptions.length > 0 && (
              <div className="max-h-48 overflow-y-auto border border-stone-200 rounded-lg bg-white">
                {productOptions.map((p) => {
                  const isLinked = linkedProductIds.has(p.id);
                  return (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-stone-50 border-b border-stone-100 last:border-0"
                    >
                      {p.images?.[0] && (
                        <Image
                          src={p.images[0]}
                          alt=""
                          width={36}
                          height={36}
                          className="w-9 h-9 rounded-lg object-cover shrink-0"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-stone-800 truncate">
                          {p.name}
                        </p>
                        {p.name_th && (
                          <p className="text-xs text-stone-400 truncate">
                            {p.name_th}
                          </p>
                        )}
                      </div>
                      {isLinked ? (
                        <span className="text-xs text-stone-400">มีอยู่แล้ว</span>
                      ) : (
                        <button
                          onClick={() => handleAddProduct(p.id)}
                          disabled={addingProductId === p.id}
                          className="text-xs px-2 py-1 rounded bg-teal-500 hover:bg-teal-600 text-white font-medium disabled:opacity-50"
                        >
                          {addingProductId === p.id ? "..." : "เพิ่ม"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {supplier.products.length === 0 ? (
          <div className="text-center py-12 text-stone-400">
            <p className="text-sm">No products in this supplier yet</p>
            <p className="text-xs mt-1">กด &quot;เพิ่มสินค้า&quot; เพื่อ map สินค้า</p>
          </div>
        ) : (
          <div className="space-y-3">
            {supplier.products.map((link) => {
              const sellPrice = link.product.price;
              const supplierPriceVal = link.supplierPrice;
              const profit = supplierPriceVal != null ? sellPrice - supplierPriceVal : null;
              const isEditing = editingPriceId === link.id;
              return (
                <div
                  key={link.id}
                  className="p-4 rounded-xl border border-stone-100 hover:border-stone-200 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {link.product.images?.[0] ? (
                      <Image
                        src={link.product.images[0]}
                        alt=""
                        width={64}
                        height={64}
                        className="w-16 h-16 rounded-lg object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-stone-100 flex items-center justify-center text-stone-400 text-xl shrink-0">
                        —
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/admin/products/${link.productId}`}
                        className="font-medium text-stone-800 hover:text-teal-600 block"
                      >
                        {link.product.name}
                      </Link>
                      {link.product.name_th && (
                        <p className="text-sm text-stone-500">{link.product.name_th}</p>
                      )}
                      {(link.product.shortDescription || link.product.shortDescription_th) && (
                        <p className="text-xs text-stone-500 mt-1 line-clamp-2">
                          {link.product.shortDescription_th ?? link.product.shortDescription ?? ""}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2 text-xs">
                        {link.product.cjProductId && (
                          <span className="font-mono text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded">
                            PID: {link.product.cjProductId}
                          </span>
                        )}
                        {link.supplierSku && (
                          <span className="text-stone-500">SKU: {link.supplierSku}</span>
                        )}
                        {link.supplierUrl && (
                          <a
                            href={link.supplierUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-teal-600 hover:underline"
                          >
                            ลิงก์ Supplier
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-right space-y-1">
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-xs text-stone-400">ราคาขาย:</span>
                        <span className="text-sm font-semibold text-stone-800">
                          ฿{sellPrice.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-xs text-stone-400">Supplier ขาย:</span>
                        {isEditing ? (
                          <span className="flex items-center gap-1">
                            <input
                              type="number"
                              value={editPriceValue}
                              onChange={(e) => setEditPriceValue(e.target.value)}
                              className="w-20 text-sm border border-stone-200 rounded px-2 py-0.5"
                              placeholder="0"
                              step="0.01"
                              min="0"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveSupplierPrice(link.productId)}
                              className="text-xs px-2 py-0.5 rounded bg-teal-500 text-white"
                            >
                              บันทึก
                            </button>
                            <button
                              onClick={() => { setEditingPriceId(null); setEditPriceValue(""); }}
                              className="text-xs text-stone-500 hover:text-stone-700"
                            >
                              ยกเลิก
                            </button>
                          </span>
                        ) : (
                          <span className="text-sm font-medium text-stone-600">
                            {supplierPriceVal != null ? (
                              <>
                                ฿{supplierPriceVal.toLocaleString()}
                                <button
                                  onClick={() => startEditPrice(link)}
                                  className="ml-1 text-teal-500 hover:text-teal-600 text-xs"
                                >
                                  แก้ไข
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => startEditPrice(link)}
                                className="text-teal-500 hover:text-teal-600 text-xs"
                              >
                                + ใส่ราคา
                              </button>
                            )}
                          </span>
                        )}
                      </div>
                      {profit != null && (
                        <div className="flex items-center gap-2 justify-end">
                          <span className="text-xs text-stone-400">กำไร:</span>
                          <span className={`text-sm font-semibold ${profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                            ฿{profit.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveProduct(link.id, link.productId)}
                      disabled={removingId === link.id}
                      className="text-xs px-2 py-1 rounded text-red-500 hover:bg-red-50 font-medium disabled:opacity-50 shrink-0"
                    >
                      {removingId === link.id ? "..." : "เอาออก"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Supplier Products — สินค้าจาก supplier ก่อน import */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-stone-800">Supplier Products (สินค้าจาก Supplier)</h2>
          <button
            onClick={() => setShowAddSp(!showAddSp)}
            className="text-sm px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium"
          >
            {showAddSp ? "ยกเลิก" : "+ เพิ่มสินค้า"}
          </button>
        </div>
        <p className="text-xs text-stone-500 mb-4">เก็บข้อมูลสินค้าจาก supplier ไว้ก่อน — เมื่อมีแววขายได้ คลิก Import เป็น Product</p>

        {showAddSp && (
          <form onSubmit={handleAddSupplierProduct} className="mb-6 p-4 bg-amber-50 rounded-xl space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">ชื่อ (EN) *</label>
                <input value={spForm.name} onChange={(e) => setSpForm((f) => ({ ...f, name: e.target.value }))} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm" placeholder="Product name" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">ชื่อ (TH)</label>
                <input value={spForm.name_th} onChange={(e) => setSpForm((f) => ({ ...f, name_th: e.target.value }))} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm" placeholder="ชื่อสินค้า" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">คำอธิบาย *</label>
              <textarea value={spForm.description} onChange={(e) => setSpForm((f) => ({ ...f, description: e.target.value }))} rows={2} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm" placeholder="Description" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">คำอธิบายสั้น</label>
              <input value={spForm.shortDescription} onChange={(e) => setSpForm((f) => ({ ...f, shortDescription: e.target.value }))} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm" placeholder="Short description" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">SKU / รหัส Supplier</label>
                <input value={spForm.supplierSku} onChange={(e) => setSpForm((f) => ({ ...f, supplierSku: e.target.value }))} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm font-mono" placeholder="SKU-001" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">ราคา Supplier (฿)</label>
                <input type="number" step="0.01" value={spForm.supplierPrice} onChange={(e) => setSpForm((f) => ({ ...f, supplierPrice: e.target.value }))} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm" placeholder="0" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">URL สินค้า Supplier</label>
              <input type="url" value={spForm.supplierUrl} onChange={(e) => setSpForm((f) => ({ ...f, supplierUrl: e.target.value }))} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm" placeholder="https://..." />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">รูป (URL คั่นด้วย space)</label>
              <input value={spForm.imagesText} onChange={(e) => setSpForm((f) => ({ ...f, imagesText: e.target.value }))} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm font-mono" placeholder="https://img1.jpg https://img2.jpg" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">หมวดหมู่</label>
                <select value={spForm.categoryId} onChange={(e) => setSpForm((f) => ({ ...f, categoryId: e.target.value }))} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">— เลือก —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">ประเภทสัตว์</label>
                <select value={spForm.petTypeId} onChange={(e) => setSpForm((f) => ({ ...f, petTypeId: e.target.value }))} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">— เลือก —</option>
                  {petTypes.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={savingSp} className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium disabled:opacity-50">
                {savingSp ? "กำลังบันทึก..." : "บันทึก"}
              </button>
              <button type="button" onClick={() => setShowAddSp(false)} className="px-4 py-2 rounded-lg border border-stone-200 text-stone-600 text-sm">
                ยกเลิก
              </button>
            </div>
          </form>
        )}

        {supplierProducts.length === 0 ? (
          <div className="text-center py-12 text-stone-400">
            <p className="text-sm">ยังไม่มี Supplier Products</p>
            <p className="text-xs mt-1">กด &quot;เพิ่มสินค้า&quot; เพื่อเก็บข้อมูลสินค้าจาก supplier ไว้ก่อน import</p>
          </div>
        ) : (
          <div className="space-y-3">
            {supplierProducts.map((sp) => (
              <div key={sp.id} className="p-4 rounded-xl border border-stone-100 hover:border-stone-200 transition-colors">
                <div className="flex items-start gap-4">
                  {sp.images?.[0] ? (
                    <Image src={sp.images[0]} alt="" width={64} height={64} className="w-16 h-16 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-stone-100 flex items-center justify-center text-stone-400 text-xl shrink-0">—</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-stone-800">{sp.name_th ?? sp.name}</span>
                      {sp.productId && (
                        <Link href={`/admin/products/${sp.productId}`} className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">
                          ✓ Import แล้ว
                        </Link>
                      )}
                    </div>
                    {sp.supplierPrice != null && (
                      <p className="text-sm text-stone-500 mt-0.5">Supplier: ฿{sp.supplierPrice.toLocaleString()}</p>
                    )}
                    {sp.supplierSku && <span className="text-xs text-stone-400 font-mono">SKU: {sp.supplierSku}</span>}
                    {sp.supplierUrl && (
                      <a href={sp.supplierUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-teal-600 hover:underline ml-2">
                        ลิงก์
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!sp.productId && (
                      <button
                        onClick={() => {
                          setImportModal(sp);
                          setImportForm({
                            shopId: shops[0]?.id ?? "",
                            categoryId: sp.categoryId ?? "",
                            petTypeId: sp.petTypeId ?? "",
                            price: "",
                            stock: "0",
                          });
                        }}
                        className="text-xs px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-600 text-white font-medium"
                      >
                        Import เป็น Product
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteSupplierProduct(sp.id)}
                      disabled={deletingSpId === sp.id}
                      className="text-xs px-2 py-1 rounded text-red-500 hover:bg-red-50 font-medium disabled:opacity-50"
                    >
                      {deletingSpId === sp.id ? "..." : "ลบ"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Import Modal */}
      {importModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !importingSpId && setImportModal(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-stone-800 mb-4">Import เป็น Product</h3>
            <p className="text-sm text-stone-600 mb-4">{importModal.name_th ?? importModal.name}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">ร้าน *</label>
                <select value={importForm.shopId} onChange={(e) => setImportForm((f) => ({ ...f, shopId: e.target.value }))} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm" required>
                  <option value="">— เลือกร้าน —</option>
                  {shops.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">หมวดหมู่ *</label>
                <select value={importForm.categoryId} onChange={(e) => setImportForm((f) => ({ ...f, categoryId: e.target.value }))} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm" required>
                  <option value="">— เลือก —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">ประเภทสัตว์</label>
                <select value={importForm.petTypeId} onChange={(e) => setImportForm((f) => ({ ...f, petTypeId: e.target.value }))} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">— เลือก —</option>
                  {petTypes.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">ราคาขาย (฿)</label>
                  <input type="number" step="0.01" value={importForm.price} onChange={(e) => setImportForm((f) => ({ ...f, price: e.target.value }))} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm" placeholder="ว่าง = ใช้ 1.5x ต้นทุน" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">สต็อก</label>
                  <input type="number" value={importForm.stock} onChange={(e) => setImportForm((f) => ({ ...f, stock: e.target.value }))} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={handleImportSupplierProduct} disabled={importingSpId || !importForm.shopId || !importForm.categoryId} className="px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium disabled:opacity-50">
                {importingSpId ? "กำลัง Import..." : "Import"}
              </button>
              <button onClick={() => setImportModal(null)} disabled={!!importingSpId} className="px-4 py-2 rounded-lg border border-stone-200 text-stone-600 text-sm">
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
