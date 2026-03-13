"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import { useLocale } from "@/context/LocaleContext";
import { ProductValidationStatus } from "@/generated/prisma/enums";
import { SupplierProductImageField } from "@/components/admin/SupplierProductImageField";
import { SupplierSelect } from "@/components/admin/SupplierSelect";

const STATUS_COLORS: Record<string, string> = {
  [ProductValidationStatus.Lead]: "bg-stone-100 text-stone-700",
  [ProductValidationStatus.Qualified]: "bg-amber-100 text-amber-700",
  [ProductValidationStatus.Approved]: "bg-green-100 text-green-700",
  [ProductValidationStatus.Rejected]: "bg-red-100 text-red-700",
};

const VALIDATION_STATUSES = (Object.values(ProductValidationStatus) as string[]).map((value) => ({
  value,
  label: value,
  color: STATUS_COLORS[value] ?? "bg-stone-100 text-stone-700",
}));

interface SupplierProductItem {
  id: string;
  name: string;
  name_th: string | null;
  description?: string;
  description_th?: string | null;
  shortDescription?: string | null;
  shortDescription_th?: string | null;
  supplierSku: string | null;
  supplierUrl: string | null;
  supplierPrice: number | null;
  images: string[];
  categoryId: string | null;
  remark: string | null;
  validationStatus: string;
  productId: string | null;
  supplier: { id: string; name: string; nameTh: string | null; imageUrl?: string | null };
  category: { id: string; name: string } | null;
  product: { id: string; name: string } | null;
}

export default function AdminSupplierProductsPage() {
  const { t } = useLocale();
  const [items, setItems] = useState<SupplierProductItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterSupplier, setFilterSupplier] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sort, setSort] = useState("newest");
  const [suppliers, setSuppliers] = useState<{ id: string; name: string; imageUrl: string | null }[]>([]);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [deletingSpId, setDeletingSpId] = useState<string | null>(null);
  const [editPriceValue, setEditPriceValue] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [savingAdd, setSavingAdd] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [addForm, setAddForm] = useState<{
    supplierId: string;
    name: string;
    name_th: string;
    description: string;
    description_th: string;
    shortDescription: string;
    shortDescription_th: string;
    sourceDescription: string;
    supplierSku: string;
    supplierUrl: string;
    supplierPrice: string;
    imagesText: string;
    categoryId: string;
    remark: string;
    validationStatus: "Lead" | "Qualified" | "Approved" | "Rejected";
  }>({
    supplierId: "",
    name: "",
    name_th: "",
    description: "",
    description_th: "",
    shortDescription: "",
    shortDescription_th: "",
    sourceDescription: "",
    supplierSku: "",
    supplierUrl: "",
    supplierPrice: "",
    imagesText: "",
    categoryId: "",
    remark: "",
    validationStatus: ProductValidationStatus.Lead,
  });
  const [editSpModal, setEditSpModal] = useState<SupplierProductItem | null>(null);
  const [editSpForm, setEditSpForm] = useState<{
    supplierId: string;
    name: string;
    name_th: string;
    description: string;
    description_th: string;
    shortDescription: string;
    shortDescription_th: string;
    supplierSku: string;
    supplierUrl: string;
    supplierPrice: string;
    imagesText: string;
    categoryId: string;
    remark: string;
    validationStatus: "Lead" | "Qualified" | "Approved" | "Rejected";
  }>({
    supplierId: "",
    name: "",
    name_th: "",
    description: "",
    description_th: "",
    shortDescription: "",
    shortDescription_th: "",
    supplierSku: "",
    supplierUrl: "",
    supplierPrice: "",
    imagesText: "",
    categoryId: "",
    remark: "",
    validationStatus: ProductValidationStatus.Lead,
  });
  const [savingEditSp, setSavingEditSp] = useState(false);
  const [importModal, setImportModal] = useState<SupplierProductItem | null>(null);
  const [importForm, setImportForm] = useState({ shopId: "", categoryId: "", petTypeId: "", price: "", stock: "0" });
  const [importingSpId, setImportingSpId] = useState<string | null>(null);
  const [shops, setShops] = useState<{ id: string; name: string }[]>([]);
  const [petTypes, setPetTypes] = useState<{ id: string; name: string }[]>([]);
  const [importCategories, setImportCategories] = useState<{ id: string; name: string }[]>([]);
  const [aiTarget, setAiTarget] = useState<string | null>(null);
  const [addDescPreview, setAddDescPreview] = useState(false);
  const [addDescPreviewTh, setAddDescPreviewTh] = useState(false);
  const [editDescPreview, setEditDescPreview] = useState(false);
  const [editDescPreviewTh, setEditDescPreviewTh] = useState(false);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [urlScanning, setUrlScanning] = useState(false);
  const pageSize = 50;

  const suggestField = async (field: string, ctx: Record<string, string>, setter: (v: string) => void) => {
    setAiTarget(field);
    try {
      const res = await fetch("/api/admin/ai/suggest-field", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, ...ctx }),
      });
      const data = await res.json();
      if (data.success && data.value) setter(data.value);
      else toast.error(data.error || "AI ไม่สามารถสร้างได้");
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setAiTarget(null);
    }
  };
  const totalPages = Math.ceil(total / pageSize);

  useEffect(() => {
    fetch("/api/admin/suppliers")
      .then((r) => r.json())
      .then((d) =>
        d.success && setSuppliers(d.data.map((s: { id: string; name: string; nameTh?: string | null; imageUrl?: string | null }) => ({ id: s.id, name: s.nameTh ?? s.name, imageUrl: s.imageUrl ?? null })))
      );
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then((d) => d.success && setCategories(d.data ?? []));
    fetch("/api/admin/shops")
      .then((r) => r.json())
      .then((d) => d.success && setShops(d.data ?? []));
    fetch("/api/pet-types")
      .then((r) => r.json())
      .then((d) => d.success && setPetTypes(d.data ?? []));
  }, []);

  useEffect(() => {
    if (importModal && importForm.shopId) {
      fetch(`/api/admin/shops/${importForm.shopId}/categories`)
        .then((r) => r.json())
        .then((d) => d.success && setImportCategories(d.data ?? []));
    } else {
      setImportCategories([]);
    }
  }, [importModal, importForm.shopId]);

  const fetchItems = useCallback(async (p: number) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p) });
    if (search) params.set("search", search);
    if (filterSupplier) params.set("supplierId", filterSupplier);
    if (filterStatus) params.set("status", filterStatus);
    if (sort && sort !== "newest") params.set("sort", sort);
    fetch(`/api/admin/supplier-products?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setItems(d.data);
          setTotal(d.total ?? d.data.length);
        }
      })
      .finally(() => setLoading(false));
  }, [search, filterSupplier, filterStatus, sort]);

  useEffect(() => {
    setPage(1);
    const timer = setTimeout(() => fetchItems(1), 300);
    return () => clearTimeout(timer);
  }, [fetchItems]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchItems(newPage);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.supplierId || !addForm.name.trim() || !addForm.description.trim()) {
      toast.error("กรุณาเลือก Supplier และกรอกชื่อกับคำอธิบาย");
      return;
    }
    setSavingAdd(true);
    try {
      const images = addForm.imagesText.trim().split(/[\s,]+/).map((u) => u.trim()).filter(Boolean);
      const res = await fetch(`/api/admin/suppliers/${addForm.supplierId}/supplier-products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...addForm,
          supplierPrice: addForm.supplierPrice ? parseFloat(addForm.supplierPrice) : null,
          images,
          categoryId: addForm.categoryId || null,
          remark: addForm.remark || null,
          validationStatus: addForm.validationStatus || ProductValidationStatus.Lead,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("เพิ่มสินค้าแล้ว");
        setShowAddModal(false);
        setAddDescPreview(false);
        setAddDescPreviewTh(false);
        setAddForm({
          supplierId: "",
          name: "",
          name_th: "",
          description: "",
          description_th: "",
          shortDescription: "",
          shortDescription_th: "",
          sourceDescription: "",
          supplierSku: "",
          supplierUrl: "",
          supplierPrice: "",
          imagesText: "",
          categoryId: "",
          remark: "",
          validationStatus: ProductValidationStatus.Lead,
        });
        fetchItems(1);
        setPage(1);
      } else {
        toast.error(data.error || "เพิ่มไม่สำเร็จ");
      }
    } finally {
      setSavingAdd(false);
    }
  };

  const startEditPrice = (sp: SupplierProductItem) => {
    setEditingPriceId(sp.id);
    setEditPriceValue(sp.supplierPrice != null ? String(sp.supplierPrice) : "");
  };

  const handleDeleteSp = async (sp: SupplierProductItem) => {
    if (!confirm(`ลบ "${sp.name}"?`)) return;
    setDeletingSpId(sp.id);
    try {
      const res = await fetch(`/api/admin/suppliers/${sp.supplier.id}/supplier-products/${sp.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("ลบแล้ว");
        fetchItems(page);
      } else {
        toast.error(data.error || "ลบไม่สำเร็จ");
      }
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setDeletingSpId(null);
    }
  };

  const handleSavePrice = async (sp: SupplierProductItem) => {
    const num = editPriceValue.trim() ? parseFloat(editPriceValue) : null;
    if (editPriceValue.trim() && (isNaN(num!) || num! < 0)) {
      toast.error("กรุณากรอกราคาที่ถูกต้อง");
      return;
    }
    const savedValue = num;
    setEditingPriceId(null);
    setEditPriceValue("");
    try {
      const res = await fetch(`/api/admin/suppliers/${sp.supplier.id}/supplier-products/${sp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierPrice: num }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("บันทึกราคาแล้ว");
        setItems((prev) =>
          prev.map((p) => (p.id === sp.id ? { ...p, supplierPrice: savedValue } : p))
        );
      } else {
        toast.error(data.error || "บันทึกไม่สำเร็จ");
      }
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    }
  };

  const handleUpdateStatus = async (sp: SupplierProductItem, newStatus: string) => {
    setUpdatingStatusId(sp.id);
    try {
      const res = await fetch(`/api/admin/suppliers/${sp.supplier.id}/supplier-products/${sp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ validationStatus: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setItems((prev) => prev.map((p) => (p.id === sp.id ? { ...p, validationStatus: newStatus } : p)));
      } else {
        toast.error(data.error || "แก้ไขไม่สำเร็จ");
      }
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleSaveEditSupplierProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSpModal) return;
    if (!editSpForm.name.trim() || !editSpForm.description.trim()) {
      toast.error("กรุณากรอกชื่อและคำอธิบาย");
      return;
    }
    setSavingEditSp(true);
    try {
      const images = editSpForm.imagesText.trim().split(/[\s,]+/).map((u) => u.trim()).filter(Boolean);
      const res = await fetch(`/api/admin/suppliers/${editSpModal.supplier.id}/supplier-products/${editSpModal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editSpForm,
          supplierId: editSpForm.supplierId || undefined,
          supplierPrice: editSpForm.supplierPrice ? parseFloat(editSpForm.supplierPrice) : null,
          images,
          categoryId: editSpForm.categoryId || null,
          remark: editSpForm.remark || null,
          validationStatus: editSpForm.validationStatus || ProductValidationStatus.Lead,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("แก้ไขแล้ว");
        setEditSpModal(null);
        setEditDescPreview(false);
        setEditDescPreviewTh(false);
        fetchItems(page);
      } else {
        toast.error(data.error || "แก้ไขไม่สำเร็จ");
      }
    } finally {
      setSavingEditSp(false);
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
      const res = await fetch(`/api/admin/suppliers/${importModal.supplier.id}/supplier-products/${importModal.id}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId: importForm.shopId,
          categoryId: importForm.categoryId,
          petTypeId: importForm.petTypeId || null,
          price: importForm.price ? parseFloat(importForm.price) : undefined,
          stock: parseInt(importForm.stock) || 0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Import เป็น Product แล้ว");
        setImportModal(null);
        setImportForm({ shopId: "", categoryId: "", petTypeId: "", price: "", stock: "0" });
        fetchItems(page);
      } else {
        toast.error(data.error || "Import ไม่สำเร็จ");
      }
    } finally {
      setImportingSpId(null);
    }
  };

  const handleScanUrl = async () => {
    const url = urlInput.trim();
    if (!url) {
      toast.error("กรุณาแปะ URL");
      return;
    }
    setUrlScanning(true);
    try {
      const res = await fetch("/api/admin/supplier-products/parse-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || "Scan ไม่สำเร็จ");
        return;
      }
      const d = data.data;
      setAddForm({
        supplierId: "",
        name: d.name || "",
        name_th: d.name_th || "",
        description: d.description || "",
        description_th: d.description_th || "",
        shortDescription: d.shortDescription || "",
        shortDescription_th: d.shortDescription_th || "",
        sourceDescription: d.description || d.description_th || "",
        supplierSku: d.supplierSku || "",
        supplierUrl: d.supplierUrl || "",
        supplierPrice: d.supplierPrice != null ? String(d.supplierPrice) : "",
        imagesText: Array.isArray(d.images) ? d.images.join(", ") : "",
        categoryId: "",
        remark: d.remark || "",
        validationStatus: ProductValidationStatus.Lead,
      });
      setShowUrlModal(false);
      setUrlInput("");
      setShowAddModal(true);
      toast.success("โหลดข้อมูลสำเร็จ เลือก Supplier แล้วบันทึกได้");
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setUrlScanning(false);
    }
  };

  const activeFilterCount = [filterSupplier, filterStatus].filter(Boolean).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">{t("supplierProducts", "adminPages")}</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-stone-500 text-sm">{total.toLocaleString()} รายการ</p>
            <Link
              href="/admin/suppliers"
              className="text-xs border border-stone-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-orange-200 bg-white text-stone-600 hover:bg-stone-50"
            >
              ← {t("suppliers", "adminMenu")}
            </Link>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowUrlModal(true)}
            className="border border-teal-400 text-teal-600 hover:bg-teal-50 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            นำเข้าจาก URL
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            + เพิ่มสินค้า
          </button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="mb-4 space-y-2">
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            placeholder="ค้นหาสินค้า..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-48 border border-stone-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
          />
          <select
            value={filterSupplier}
            onChange={(e) => setFilterSupplier(e.target.value)}
            className="border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white"
          >
            <option value="">Supplier: ทั้งหมด</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white"
          >
            <option value="">สถานะ: ทั้งหมด</option>
            {VALIDATION_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value); setPage(1); }}
            className="border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white"
          >
            <option value="newest">เรียง: ใหม่ก่อน</option>
            <option value="oldest">เรียง: เก่าก่อน</option>
            <option value="name_asc">ชื่อ: A → Z</option>
            <option value="name_desc">ชื่อ: Z → A</option>
            <option value="price_asc">ราคา: น้อย → มาก</option>
            <option value="price_desc">ราคา: มาก → น้อย</option>
          </select>
          {activeFilterCount > 0 && (
            <button
              onClick={() => { setFilterSupplier(""); setFilterStatus(""); }}
              className="flex items-center gap-1.5 border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-500 hover:bg-stone-50 transition-colors"
            >
              ล้าง
              <span className="w-4 h-4 rounded-full bg-orange-500 text-white text-[10px] flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-stone-400 text-sm">กำลังโหลด...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-stone-400 text-sm">
            <p>ยังไม่มี Supplier Products</p>
            <Link href="/admin/suppliers" className="text-teal-600 hover:underline text-sm mt-2 block">
              ไปที่ Suppliers เพื่อเพิ่มสินค้า
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50">
                <th className="text-left px-4 py-3 text-stone-500 font-medium">สินค้า</th>
                <th className="text-left px-4 py-3 text-stone-500 font-medium">Supplier</th>
                <th className="text-left px-4 py-3 text-stone-500 font-medium">สถานะ</th>
                <th className="text-right px-4 py-3 text-stone-500 font-medium">ราคา</th>
                <th className="text-left px-4 py-3 text-stone-500 font-medium hidden md:table-cell">SKU</th>
                <th className="text-center px-4 py-3 text-stone-500 font-medium hidden sm:table-cell">Import</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {items.map((sp) => (
                <tr key={sp.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/supplier-products/${sp.id}/view`}
                      className="flex items-center gap-3 hover:text-orange-600 transition-colors"
                    >
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-stone-100 shrink-0">
                        {sp.images?.[0] ? (
                          <Image src={sp.images[0]} alt="" fill className="object-cover" unoptimized />
                        ) : (
                          <div className="flex items-center justify-center h-full text-stone-300 text-lg">📦</div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="font-medium text-stone-800 line-clamp-1 block">{sp.name_th ?? sp.name}</span>
                        {sp.shortDescription_th && (
                          <span className="text-xs text-stone-500 line-clamp-2 block mt-0.5">{sp.shortDescription_th}</span>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/suppliers/${sp.supplier.id}`}
                      className="flex items-center gap-3 text-stone-600 hover:text-orange-600 hover:underline"
                    >
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-stone-100 shrink-0">
                        {sp.supplier.imageUrl ? (
                          <Image src={sp.supplier.imageUrl} alt="" fill className="object-cover" unoptimized />
                        ) : (
                          <div className="flex items-center justify-center h-full text-stone-300 text-lg">🏪</div>
                        )}
                      </div>
                      <span>{sp.supplier.nameTh ?? sp.supplier.name}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={sp.validationStatus ?? ProductValidationStatus.Lead}
                      disabled={updatingStatusId === sp.id}
                      onChange={(e) => handleUpdateStatus(sp, e.target.value)}
                      className={`text-xs px-2 py-1 rounded-lg border font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-200 disabled:opacity-50 ${
                        STATUS_COLORS[sp.validationStatus ?? "Lead"] ?? "bg-stone-100 text-stone-700"
                      } border-transparent`}
                    >
                      {VALIDATION_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editingPriceId === sp.id ? (
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="number"
                          step="0.01"
                          value={editPriceValue}
                          onChange={(e) => setEditPriceValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSavePrice(sp);
                            if (e.key === "Escape") { setEditingPriceId(null); setEditPriceValue(""); }
                          }}
                          onBlur={() => handleSavePrice(sp)}
                          autoFocus
                          className="w-24 text-right border border-stone-200 rounded px-2 py-1 text-sm"
                        />
                        <span className="text-stone-500 text-xs">฿</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEditPrice(sp)}
                        className="font-medium text-stone-800 hover:text-orange-600 hover:underline"
                      >
                        {sp.supplierPrice != null ? `฿${sp.supplierPrice.toLocaleString("th-TH")}` : "— ใส่ราคา"}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-stone-500 font-mono text-xs hidden md:table-cell">
                    {sp.supplierSku ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-center hidden sm:table-cell">
                    {sp.productId ? (
                      <Link
                        href={`/admin/products/${sp.productId}`}
                        className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 hover:bg-green-200"
                      >
                        ✓ Import แล้ว
                      </Link>
                    ) : (
                      <span className="text-stone-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex flex-col items-stretch gap-0.5 min-w-[3.25rem]">
                      <Link
                        href={`/admin/supplier-products/${sp.id}/view`}
                        className="inline-block text-[7px] px-1.5 py-0.5 rounded border border-stone-200/80 text-stone-600 bg-stone-50/50 hover:bg-stone-100/80 hover:border-stone-300 transition-colors text-center leading-tight"
                      >
                        ดู
                      </Link>
                      <Link
                        href={`/admin/supplier-products/${sp.id}/edit`}
                        className="inline-block text-[7px] px-1 py-0.5 rounded border border-amber-200/80 text-amber-700/90 bg-amber-50/50 hover:bg-amber-100/80 hover:border-amber-300 transition-colors text-center leading-tight"
                      >
                        แก้ไข
                      </Link>
                      {!sp.productId ? (
                        <button
                          onClick={() => {
                            setImportModal(sp);
                            setImportForm({
                              shopId: shops[0]?.id ?? "",
                              categoryId: "",
                              petTypeId: "",
                              price: "",
                              stock: "0",
                            });
                          }}
                          className="inline-block text-[7px] px-1.5 py-0.5 rounded border border-teal-300/90 text-teal-700 bg-teal-50/70 hover:bg-teal-100/80 hover:border-teal-400 transition-colors text-center leading-tight"
                        >
                          Import
                        </button>
                      ) : null}
                      <button
                        onClick={() => handleDeleteSp(sp)}
                        disabled={deletingSpId === sp.id}
                        className="inline-block text-[7px] px-1.5 py-0.5 rounded border border-red-200/80 text-red-600 bg-red-50/50 hover:bg-red-100/80 hover:border-red-300 transition-colors text-center leading-tight disabled:opacity-50"
                      >
                        {deletingSpId === sp.id ? "…" : "ลบ"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 mt-4">
          <button
            disabled={page === 1}
            onClick={() => handlePageChange(page - 1)}
            className="px-3 py-1.5 rounded-lg text-sm border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ←
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
            .reduce<(number | "...")[]>((acc, p, i, arr) => {
              if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              p === "..." ? (
                <span key={`e-${i}`} className="px-2 text-stone-300">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => handlePageChange(p as number)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    page === p ? "bg-stone-800 text-white border-stone-800" : "border-stone-200 text-stone-600 hover:bg-stone-50"
                  }`}
                >
                  {p}
                </button>
              )
            )}
          <button
            disabled={page === totalPages}
            onClick={() => handlePageChange(page + 1)}
            className="px-3 py-1.5 rounded-lg text-sm border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            →
          </button>
        </div>
      )}

      {/* Import from URL Modal */}
      {showUrlModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={(e) => {
            if (e.target === e.currentTarget && !urlScanning) {
              setShowUrlModal(false);
              setUrlInput("");
            }
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-stone-800 mb-4">นำเข้าจาก URL</h3>
            <p className="text-sm text-stone-500 mb-4">แปะ link สินค้า AI จะ scan และเติมข้อมูลให้</p>
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">URL สินค้า *</label>
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
                disabled={urlScanning}
              />
            </div>
            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={handleScanUrl}
                disabled={urlScanning}
                className="flex-1 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 disabled:bg-stone-300 text-white text-sm font-medium transition-colors"
              >
                {urlScanning ? "กำลัง Scan..." : "Scan"}
              </button>
              <button
                type="button"
                onClick={() => { setShowUrlModal(false); setUrlInput(""); }}
                disabled={urlScanning}
                className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-sm disabled:opacity-50"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddModal(false);
              setAddDescPreview(false);
              setAddDescPreviewTh(false);
            }
          }}
        >
            <div
              className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
              <h2 className="font-bold text-stone-800">เพิ่ม Supplier Product</h2>
              <button
                type="button"
                onClick={() => { setShowAddModal(false); setAddDescPreview(false); setAddDescPreviewTh(false); }}
                className="text-stone-400 hover:text-stone-600 text-xl leading-none"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="overflow-y-auto flex-1 p-6 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Supplier *</label>
                <SupplierSelect
                  value={addForm.supplierId}
                  onChange={(id) => setAddForm((f) => ({ ...f, supplierId: id }))}
                  placeholder="ค้นหา supplier..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-stone-600">ชื่อ (EN) *</label>
                    <button type="button" disabled={!!aiTarget} onClick={() => suggestField("sp_name", { name_th: addForm.name_th }, (v) => setAddForm((f) => ({ ...f, name: v })))} className="text-[10px] px-2 py-0.5 rounded-lg border border-violet-200 text-violet-600 hover:bg-violet-50 disabled:opacity-50">{aiTarget === "sp_name" ? "…" : "✨ AI"}</button>
                  </div>
                  <input
                    value={addForm.name}
                    onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
                    placeholder="Product name"
                    required
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-stone-600">ชื่อ (TH)</label>
                    <button type="button" disabled={!!aiTarget} onClick={() => suggestField("sp_name_th", { name: addForm.name }, (v) => setAddForm((f) => ({ ...f, name_th: v })))} className="text-[10px] px-2 py-0.5 rounded-lg border border-violet-200 text-violet-600 hover:bg-violet-50 disabled:opacity-50">{aiTarget === "sp_name_th" ? "…" : "✨ AI"}</button>
                  </div>
                  <input
                    value={addForm.name_th}
                    onChange={(e) => setAddForm((f) => ({ ...f, name_th: e.target.value }))}
                    className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
                    placeholder="ชื่อสินค้า"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-stone-600">คำอธิบาย (EN) *</label>
                    <div className="flex items-center gap-1">
                      <button type="button" disabled={!!aiTarget} onClick={() => suggestField("sp_description", { description_th: addForm.description_th, name: addForm.name, name_th: addForm.name_th, sourceDescription: addForm.sourceDescription }, (v) => setAddForm((f) => ({ ...f, description: v })))} className="text-[10px] px-2 py-0.5 rounded-lg border border-violet-200 text-violet-600 hover:bg-violet-50 disabled:opacity-50">{aiTarget === "sp_description" ? "…" : "✨ AI"}</button>
                      <button type="button" onClick={() => setAddDescPreview((v) => !v)} className="text-[10px] text-stone-400 hover:text-orange-500 transition-colors">{addDescPreview ? "✏️ แก้ไข" : "👁 HTML"}</button>
                    </div>
                  </div>
                  {addDescPreview ? (
                    <div className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm min-h-24 prose prose-sm desc-html max-w-none overflow-auto" dangerouslySetInnerHTML={{ __html: addForm.description }} />
                  ) : (
                    <textarea
                      value={addForm.description}
                      onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))}
                      rows={3}
                      className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
                      placeholder="Description (รองรับ HTML)"
                      required
                    />
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-stone-600">คำอธิบาย (TH)</label>
                    <div className="flex items-center gap-1">
                      <button type="button" disabled={!!aiTarget} onClick={() => suggestField("sp_description_th", { description: addForm.description, name: addForm.name, name_th: addForm.name_th, sourceDescription: addForm.sourceDescription }, (v) => setAddForm((f) => ({ ...f, description_th: v })))} className="text-[10px] px-2 py-0.5 rounded-lg border border-violet-200 text-violet-600 hover:bg-violet-50 disabled:opacity-50">{aiTarget === "sp_description_th" ? "…" : "✨ AI"}</button>
                      <button type="button" onClick={() => setAddDescPreviewTh((v) => !v)} className="text-[10px] text-stone-400 hover:text-orange-500 transition-colors">{addDescPreviewTh ? "✏️ แก้ไข" : "👁 HTML"}</button>
                    </div>
                  </div>
                  {addDescPreviewTh ? (
                    <div className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm min-h-24 prose prose-sm desc-html max-w-none overflow-auto" dangerouslySetInnerHTML={{ __html: addForm.description_th }} />
                  ) : (
                    <textarea
                      value={addForm.description_th}
                      onChange={(e) => setAddForm((f) => ({ ...f, description_th: e.target.value }))}
                      rows={3}
                      className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
                      placeholder="คำอธิบายสินค้า (รองรับ HTML)"
                    />
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">SKU</label>
                  <input
                    value={addForm.supplierSku}
                    onChange={(e) => setAddForm((f) => ({ ...f, supplierSku: e.target.value }))}
                    className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm font-mono"
                    placeholder="SKU-001"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">ราคา Supplier (฿)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={addForm.supplierPrice}
                    onChange={(e) => setAddForm((f) => ({ ...f, supplierPrice: e.target.value }))}
                    className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">URL สินค้า Supplier</label>
                <input
                  type="url"
                  value={addForm.supplierUrl}
                  onChange={(e) => setAddForm((f) => ({ ...f, supplierUrl: e.target.value }))}
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="https://..."
                />
              </div>
              <SupplierProductImageField
                value={addForm.imagesText}
                onChange={(v) => setAddForm((f) => ({ ...f, imagesText: v }))}
              />
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">หมวดหมู่</label>
                <select
                  value={addForm.categoryId}
                  onChange={(e) => setAddForm((f) => ({ ...f, categoryId: e.target.value }))}
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">— เลือก —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">สถานะ</label>
                <select
                  value={addForm.validationStatus}
                  onChange={(e) => setAddForm((f) => ({ ...f, validationStatus: e.target.value as "Lead" | "Qualified" | "Approved" | "Rejected" }))}
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
                >
                  {VALIDATION_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Remark</label>
                <textarea
                  value={addForm.remark}
                  onChange={(e) => setAddForm((f) => ({ ...f, remark: e.target.value }))}
                  rows={2}
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="หมายเหตุเพิ่มเติม"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={savingAdd}
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium disabled:opacity-50"
                >
                  {savingAdd ? "กำลังบันทึก..." : "บันทึก"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setAddDescPreview(false); setAddDescPreviewTh(false); }}
                  className="px-4 py-2 rounded-lg border border-stone-200 text-stone-600 text-sm"
                >
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editSpModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget && !savingEditSp) {
              setEditSpModal(null);
              setEditDescPreview(false);
              setEditDescPreviewTh(false);
            }
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-stone-100 shrink-0">
              <h3 className="font-bold text-stone-800">แก้ไข Supplier Product</h3>
            </div>
            <form onSubmit={handleSaveEditSupplierProduct} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="overflow-y-auto flex-1 p-6 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">Supplier</label>
                  <SupplierSelect
                    value={editSpForm.supplierId}
                    onChange={(id) => setEditSpForm((f) => ({ ...f, supplierId: id }))}
                    selectedSupplier={editSpModal?.supplier ? { id: editSpModal.supplier.id, name: editSpModal.supplier.name, nameTh: editSpModal.supplier.nameTh ?? null, imageUrl: editSpModal.supplier.imageUrl ?? null } : undefined}
                    detailLink={editSpForm.supplierId ? `/admin/suppliers/${editSpForm.supplierId}` : undefined}
                    detailLinkLabel="แก้ไขรูป Supplier → หน้า Supplier Detail"
                    placeholder="ค้นหา supplier..."
                  />
                </div>
                <SupplierProductImageField value={editSpForm.imagesText} onChange={(v) => setEditSpForm((f) => ({ ...f, imagesText: v }))} />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-stone-600">ชื่อ (EN) *</label>
                      <button type="button" disabled={!!aiTarget} onClick={() => suggestField("sp_name", { name_th: editSpForm.name_th }, (v) => setEditSpForm((f) => ({ ...f, name: v })))} className="text-[10px] px-2 py-0.5 rounded-lg border border-violet-200 text-violet-600 hover:bg-violet-50 disabled:opacity-50">{aiTarget === "sp_name" ? "…" : "✨ AI"}</button>
                    </div>
                    <input value={editSpForm.name} onChange={(e) => setEditSpForm((f) => ({ ...f, name: e.target.value }))} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm" placeholder="Product name" required />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-stone-600">ชื่อ (TH)</label>
                      <button type="button" disabled={!!aiTarget} onClick={() => suggestField("sp_name_th", { name: editSpForm.name }, (v) => setEditSpForm((f) => ({ ...f, name_th: v })))} className="text-[10px] px-2 py-0.5 rounded-lg border border-violet-200 text-violet-600 hover:bg-violet-50 disabled:opacity-50">{aiTarget === "sp_name_th" ? "…" : "✨ AI"}</button>
                    </div>
                    <input value={editSpForm.name_th} onChange={(e) => setEditSpForm((f) => ({ ...f, name_th: e.target.value }))} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm" placeholder="ชื่อสินค้า" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-stone-600">คำอธิบาย (EN) *</label>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => setEditDescPreview((v) => !v)} className="text-[10px] text-stone-400 hover:text-orange-500 transition-colors">{editDescPreview ? "✏️ แก้ไข" : "👁 HTML"}</button>
                      </div>
                    </div>
                    {editDescPreview ? (
                      <div className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm min-h-24 prose prose-sm desc-html max-w-none overflow-auto" dangerouslySetInnerHTML={{ __html: editSpForm.description }} />
                    ) : (
                      <textarea value={editSpForm.description} onChange={(e) => setEditSpForm((f) => ({ ...f, description: e.target.value }))} rows={3} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm" required />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-stone-600">คำอธิบาย (TH)</label>
                      <div className="flex items-center gap-1">
                        <button type="button" disabled={!!aiTarget} onClick={() => suggestField("sp_description_th", { description: editSpForm.description, name: editSpForm.name, name_th: editSpForm.name_th, sourceDescription: addForm.sourceDescription }, (v) => setEditSpForm((f) => ({ ...f, description_th: v })))} className="text-[10px] px-2 py-0.5 rounded-lg border border-violet-200 text-violet-600 hover:bg-violet-50 disabled:opacity-50">{aiTarget === "sp_description_th" ? "…" : "✨ AI"}</button>
                        <button type="button" onClick={() => setEditDescPreviewTh((v) => !v)} className="text-[10px] text-stone-400 hover:text-orange-500 transition-colors">{editDescPreviewTh ? "✏️ แก้ไข" : "👁 HTML"}</button>
                      </div>
                    </div>
                    {editDescPreviewTh ? (
                      <div className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm min-h-24 prose prose-sm desc-html max-w-none overflow-auto" dangerouslySetInnerHTML={{ __html: editSpForm.description_th }} />
                    ) : (
                      <textarea value={editSpForm.description_th} onChange={(e) => setEditSpForm((f) => ({ ...f, description_th: e.target.value }))} rows={3} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm" />
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-stone-600">คำอธิบายสั้น (EN)</label>
                    </div>
                    <textarea value={editSpForm.shortDescription} onChange={(e) => setEditSpForm((f) => ({ ...f, shortDescription: e.target.value }))} rows={3} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-stone-600">คำอธิบายสั้น (TH)</label>
                        <button type="button" disabled={!!aiTarget} onClick={() => suggestField("sp_shortDescription_th", { shortDescription: editSpForm.shortDescription, name: editSpForm.name, name_th: editSpForm.name_th, sourceDescription: addForm.sourceDescription }, (v) => setEditSpForm((f) => ({ ...f, shortDescription_th: v })))} className="text-[10px] px-2 py-0.5 rounded-lg border border-violet-200 text-violet-600 hover:bg-violet-50 disabled:opacity-50">{aiTarget === "sp_shortDescription_th" ? "…" : "✨ AI"}</button>
                    </div>
                    <textarea value={editSpForm.shortDescription_th} onChange={(e) => setEditSpForm((f) => ({ ...f, shortDescription_th: e.target.value }))} rows={3} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 mb-1">SKU</label>
                    <input value={editSpForm.supplierSku} onChange={(e) => setEditSpForm((f) => ({ ...f, supplierSku: e.target.value }))} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 mb-1">ราคา Supplier (฿)</label>
                    <input type="number" step="0.01" value={editSpForm.supplierPrice} onChange={(e) => setEditSpForm((f) => ({ ...f, supplierPrice: e.target.value }))} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">URL สินค้า Supplier</label>
                  <input type="url" value={editSpForm.supplierUrl} onChange={(e) => setEditSpForm((f) => ({ ...f, supplierUrl: e.target.value }))} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">หมวดหมู่</label>
                  <select value={editSpForm.categoryId} onChange={(e) => setEditSpForm((f) => ({ ...f, categoryId: e.target.value }))} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm">
                    <option value="">— เลือก —</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">สถานะ</label>
                  <select value={editSpForm.validationStatus} onChange={(e) => setEditSpForm((f) => ({ ...f, validationStatus: e.target.value as "Lead" | "Qualified" | "Approved" | "Rejected" }))} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm">
                    {VALIDATION_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">Remark</label>
                  <textarea value={editSpForm.remark} onChange={(e) => setEditSpForm((f) => ({ ...f, remark: e.target.value }))} rows={2} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="flex gap-2 p-6 pt-0 shrink-0">
                <button type="submit" disabled={savingEditSp} className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium disabled:opacity-50">
                  {savingEditSp ? "กำลังบันทึก..." : "บันทึก"}
                </button>
                <button type="button" onClick={() => { setEditSpModal(null); setEditDescPreview(false); setEditDescPreviewTh(false); }} disabled={savingEditSp} className="px-4 py-2 rounded-lg border border-stone-200 text-stone-600 text-sm">
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {importModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={(e) => e.target === e.currentTarget && !importingSpId && setImportModal(null)}
        >
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-stone-800 mb-4">Import เป็น Product</h3>
            <p className="text-sm text-stone-600 mb-4">{importModal.name_th ?? importModal.name}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">ร้าน *</label>
                <select value={importForm.shopId} onChange={(e) => setImportForm((f) => ({ ...f, shopId: e.target.value, categoryId: "" }))} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm" required>
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
                  {importCategories.map((c) => (
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
                  <input type="number" step="0.01" value={importForm.price} onChange={(e) => setImportForm((f) => ({ ...f, price: e.target.value }))} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm" placeholder="ว่าง = 1.5x ต้นทุน" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">สต็อก</label>
                  <input type="number" value={importForm.stock} onChange={(e) => setImportForm((f) => ({ ...f, stock: e.target.value }))} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={handleImportSupplierProduct} disabled={!!importingSpId || !importForm.shopId || !importForm.categoryId} className="px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium disabled:opacity-50">
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
