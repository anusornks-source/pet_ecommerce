"use client";

import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface CategoryGroup {
  id: string;
  name: string;
  name_th: string | null;
  slug: string;
  icon: string | null;
  order: number;
}

interface Category {
  id: string;
  name: string;
  name_th: string | null;
  slug: string;
  icon: string | null;
  order: number;
  groupId: string | null;
  group: CategoryGroup | null;
  _count: { products: number };
}

// ─── Sortable Row ─────────────────────────────────────────────

function SortableRow({
  cat,
  groups,
  onEdit,
  onDelete,
  onGroupChange,
}: {
  cat: Category;
  groups: CategoryGroup[];
  onEdit: (cat: Category) => void;
  onDelete: (cat: Category) => void;
  onGroupChange: (id: string, groupId: string | null) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cat.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <tr ref={setNodeRef} style={style} className="hover:bg-stone-50 transition-colors">
      <td className="pl-3 pr-1 py-3 w-6">
        <span {...attributes} {...listeners} className="cursor-grab text-stone-300 hover:text-stone-500 select-none text-lg">⠿</span>
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{cat.icon}</span>
          <div>
            <div className="font-medium text-stone-800 text-sm">{cat.name}</div>
            {cat.name_th && <div className="text-xs text-stone-400">{cat.name_th}</div>}
          </div>
        </div>
      </td>
      <td className="px-3 py-3 hidden sm:table-cell">
        <select
          value={cat.groupId ?? ""}
          onChange={(e) => onGroupChange(cat.id, e.target.value || null)}
          className="text-xs border border-stone-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-orange-200 bg-white"
        >
          <option value="">— ไม่มีกลุ่ม —</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>{g.icon} {g.name_th || g.name}</option>
          ))}
        </select>
      </td>
      <td className="px-3 py-3 text-stone-400 font-mono text-xs hidden lg:table-cell">{cat.slug}</td>
      <td className="px-3 py-3 text-right text-stone-500 text-sm">{cat._count.products}</td>
      <td className="px-3 py-3">
        <div className="flex items-center justify-end gap-1.5">
          <button onClick={() => onEdit(cat)} className="text-xs px-2.5 py-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50">แก้ไข</button>
          <button
            onClick={() => onDelete(cat)}
            disabled={cat._count.products > 0}
            title={cat._count.products > 0 ? "มีสินค้าอยู่" : ""}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-red-100 text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed"
          >ลบ</button>
        </div>
      </td>
    </tr>
  );
}

// ─── Main Page ────────────────────────────────────────────────

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [groups, setGroups] = useState<CategoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newForm, setNewForm] = useState({ name: "", name_th: "", slug: "", icon: "", groupId: "" });
  const [busyNew, setBusyNew] = useState<string | null>(null);

  const [editCat, setEditCat] = useState<Category | null>(null);
  const [editForm, setEditForm] = useState({ name: "", name_th: "", slug: "", icon: "", groupId: "" });
  const [busyEdit, setBusyEdit] = useState<string | null>(null);

  // Group management
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: "", name_th: "", slug: "", icon: "" });
  const [addingGroup, setAddingGroup] = useState(false);
  const [busyGroup, setBusyGroup] = useState<string | null>(null);
  const [editGroupId, setEditGroupId] = useState<string | null>(null);
  const [editGroupForm, setEditGroupForm] = useState({ name: "", name_th: "", slug: "", icon: "" });
  const [busyEditGroup, setBusyEditGroup] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const fetchAll = useCallback(async () => {
    const [catRes, grpRes] = await Promise.all([
      fetch("/api/admin/categories"),
      fetch("/api/admin/category-groups"),
    ]);
    const [catData, grpData] = await Promise.all([catRes.json(), grpRes.json()]);
    if (catData.success) setCategories(catData.data);
    if (grpData.success) setGroups(grpData.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── AI suggest ────────────────────────────────────────────

  const suggestField = async (
    field: string,
    ctx: Record<string, string>,
    setter: (val: string) => void,
    setBusy: (v: string | null) => void
  ) => {
    setBusy(field);
    const endpoint = field === "icon" ? "/api/admin/ai/suggest-icon" : "/api/admin/ai/suggest-field";
    const body = field === "icon" ? ctx : { field, ...ctx };
    const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (data.success) setter(data.icon ?? data.value);
    setBusy(null);
  };

  const AIBtn = ({ field, disabled, onSuggest, busy }: { field: string; disabled?: boolean; onSuggest: () => void; busy: string | null }) => (
    <button type="button" disabled={!!disabled || busy === field} onClick={onSuggest}
      className="shrink-0 px-2 py-2 rounded-xl border border-violet-200 bg-violet-50 text-violet-600 text-xs font-medium hover:bg-violet-100 disabled:opacity-40">
      {busy === field ? "…" : "✨"}
    </button>
  );

  // ── Add category ─────────────────────────────────────────

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newForm, groupId: newForm.groupId || null }),
    });
    const data = await res.json();
    if (data.success) {
      toast.success("เพิ่มหมวดหมู่แล้ว");
      setNewForm({ name: "", name_th: "", slug: "", icon: "", groupId: "" });
      fetchAll();
    } else toast.error(data.error || "เกิดข้อผิดพลาด");
    setAdding(false);
  };

  // ── Edit category ─────────────────────────────────────────

  const startEdit = (cat: Category) => {
    setEditCat(cat);
    setEditForm({ name: cat.name, name_th: cat.name_th || "", slug: cat.slug, icon: cat.icon || "", groupId: cat.groupId || "" });
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCat) return;
    const res = await fetch(`/api/admin/categories/${editCat.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editForm, groupId: editForm.groupId || null }),
    });
    const data = await res.json();
    if (data.success) { toast.success("บันทึกแล้ว"); setEditCat(null); fetchAll(); }
    else toast.error(data.error || "เกิดข้อผิดพลาด");
  };

  // ── Delete ────────────────────────────────────────────────

  const handleDelete = async (cat: Category) => {
    if (!confirm(`ลบหมวดหมู่ "${cat.name}" ใช่หรือไม่?`)) return;
    const res = await fetch(`/api/admin/categories/${cat.id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) { toast.success("ลบแล้ว"); setCategories((prev) => prev.filter((c) => c.id !== cat.id)); }
    else toast.error(data.error || "เกิดข้อผิดพลาด");
  };

  // ── Group change (inline) ─────────────────────────────────

  const handleGroupChange = async (id: string, groupId: string | null) => {
    setCategories((prev) => prev.map((c) => c.id === id ? { ...c, groupId, group: groups.find((g) => g.id === groupId) ?? null } : c));
    await fetch(`/api/admin/categories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId }),
    });
  };

  // ── Drag-and-drop reorder ─────────────────────────────────

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = categories.findIndex((c) => c.id === active.id);
    const newIndex = categories.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(categories, oldIndex, newIndex).map((c, i) => ({ ...c, order: i }));
    setCategories(reordered);

    await fetch("/api/admin/categories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reordered.map((c) => ({ id: c.id, order: c.order, groupId: c.groupId }))),
    });
  };

  // ── Add group ─────────────────────────────────────────────

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingGroup(true);
    const res = await fetch("/api/admin/category-groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newGroup),
    });
    const data = await res.json();
    if (data.success) { toast.success("เพิ่มกลุ่มแล้ว"); setNewGroup({ name: "", name_th: "", slug: "", icon: "" }); setShowGroupForm(false); fetchAll(); }
    else toast.error(data.error || "เกิดข้อผิดพลาด");
    setAddingGroup(false);
  };

  const startEditGroup = (g: CategoryGroup) => {
    setEditGroupId(g.id);
    setEditGroupForm({ name: g.name, name_th: g.name_th || "", slug: g.slug, icon: g.icon || "" });
  };

  const handleEditGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editGroupId) return;
    const res = await fetch(`/api/admin/category-groups/${editGroupId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editGroupForm),
    });
    const data = await res.json();
    if (data.success) { toast.success("บันทึกกลุ่มแล้ว"); setEditGroupId(null); fetchAll(); }
    else toast.error(data.error || "เกิดข้อผิดพลาด");
  };

  const handleDeleteGroup = async (g: CategoryGroup & { _count?: { categories: number } }) => {
    if (!confirm(`ลบกลุ่ม "${g.name}" ? หมวดหมู่ในกลุ่มจะถูกย้ายออกมา`)) return;
    const res = await fetch(`/api/admin/category-groups/${g.id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) { toast.success("ลบกลุ่มแล้ว"); fetchAll(); }
    else toast.error(data.error || "เกิดข้อผิดพลาด");
  };

  const inputCls = "flex-1 border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200";

  // ── Grouped view for display ──────────────────────────────

  const grouped: { group: CategoryGroup | null; cats: Category[] }[] = [];
  const ungrouped = categories.filter((c) => !c.groupId);
  groups.forEach((g) => {
    const cats = categories.filter((c) => c.groupId === g.id);
    if (cats.length > 0) grouped.push({ group: g, cats });
  });
  if (ungrouped.length > 0) grouped.push({ group: null, cats: ungrouped });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">หมวดหมู่</h1>
          <p className="text-stone-500 text-sm mt-1">{categories.length} หมวดหมู่ · {groups.length} กลุ่ม</p>
        </div>
        <button onClick={() => setShowGroupForm((v) => !v)}
          className="text-sm px-4 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors">
          {showGroupForm ? "ซ่อน" : "+ เพิ่มกลุ่ม"}
        </button>
      </div>

      {/* Group form */}
      {showGroupForm && (
        <div className="bg-white rounded-2xl border border-violet-100 p-5 mb-6">
          <h2 className="font-semibold text-stone-700 mb-3">เพิ่มกลุ่มหมวดหมู่</h2>
          <form onSubmit={handleAddGroup} className="space-y-2">
            <div className="flex flex-wrap gap-2 items-center">
              <div className="flex gap-1">
                <input required value={newGroup.name} onChange={(e) => setNewGroup((f) => ({ ...f, name: e.target.value }))} placeholder="EN name *" className="border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200 w-36" />
                <AIBtn field="name_en" busy={busyGroup} disabled={!newGroup.name_th}
                  onSuggest={() => suggestField("name_en", { name_th: newGroup.name_th }, (v) => setNewGroup((f) => ({ ...f, name: v })), setBusyGroup)} />
              </div>
              <div className="flex gap-1">
                <input value={newGroup.name_th} onChange={(e) => setNewGroup((f) => ({ ...f, name_th: e.target.value }))} placeholder="ชื่อไทย" className="border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200 w-36" />
                <AIBtn field="name_th" busy={busyGroup} disabled={!newGroup.name}
                  onSuggest={() => suggestField("name_th", { name: newGroup.name }, (v) => setNewGroup((f) => ({ ...f, name_th: v })), setBusyGroup)} />
              </div>
              <div className="flex gap-1">
                <input required value={newGroup.slug} onChange={(e) => setNewGroup((f) => ({ ...f, slug: e.target.value }))} placeholder="slug *" className="border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200 w-32" />
                <AIBtn field="slug" busy={busyGroup} disabled={!newGroup.name && !newGroup.name_th}
                  onSuggest={() => suggestField("slug", { name: newGroup.name, name_th: newGroup.name_th }, (v) => setNewGroup((f) => ({ ...f, slug: v })), setBusyGroup)} />
              </div>
              <div className="flex gap-1">
                <input value={newGroup.icon} onChange={(e) => setNewGroup((f) => ({ ...f, icon: e.target.value }))} placeholder="🗂️" className="border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200 w-16 text-center" />
                <AIBtn field="icon" busy={busyGroup} disabled={!newGroup.name && !newGroup.name_th}
                  onSuggest={() => suggestField("icon", { name: newGroup.name, name_th: newGroup.name_th }, (v) => setNewGroup((f) => ({ ...f, icon: v })), setBusyGroup)} />
              </div>
              <button type="submit" disabled={addingGroup} className="px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-60">
                {addingGroup ? "..." : "+ เพิ่ม"}
              </button>
            </div>
          </form>
          {groups.length > 0 && (
            <div className="mt-4 space-y-2">
              {groups.map((g) =>
                editGroupId === g.id ? (
                  <form key={g.id} onSubmit={handleEditGroup} className="flex flex-wrap gap-1.5 items-center bg-violet-50 rounded-xl px-3 py-2">
                    <div className="flex gap-1">
                      <input value={editGroupForm.icon} onChange={(e) => setEditGroupForm((f) => ({ ...f, icon: e.target.value }))} placeholder="🗂️" className="w-12 border border-stone-200 rounded-lg px-2 py-1.5 text-sm text-center" />
                      <AIBtn field="icon" busy={busyEditGroup} disabled={!editGroupForm.name && !editGroupForm.name_th}
                        onSuggest={() => suggestField("icon", { name: editGroupForm.name, name_th: editGroupForm.name_th }, (v) => setEditGroupForm((f) => ({ ...f, icon: v })), setBusyEditGroup)} />
                    </div>
                    <div className="flex gap-1">
                      <input required value={editGroupForm.name} onChange={(e) => setEditGroupForm((f) => ({ ...f, name: e.target.value }))} placeholder="EN name" className="w-28 border border-stone-200 rounded-lg px-2 py-1.5 text-sm" />
                      <AIBtn field="name_en" busy={busyEditGroup} disabled={!editGroupForm.name_th}
                        onSuggest={() => suggestField("name_en", { name_th: editGroupForm.name_th }, (v) => setEditGroupForm((f) => ({ ...f, name: v })), setBusyEditGroup)} />
                    </div>
                    <div className="flex gap-1">
                      <input value={editGroupForm.name_th} onChange={(e) => setEditGroupForm((f) => ({ ...f, name_th: e.target.value }))} placeholder="ชื่อไทย" className="w-28 border border-stone-200 rounded-lg px-2 py-1.5 text-sm" />
                      <AIBtn field="name_th" busy={busyEditGroup} disabled={!editGroupForm.name}
                        onSuggest={() => suggestField("name_th", { name: editGroupForm.name }, (v) => setEditGroupForm((f) => ({ ...f, name_th: v })), setBusyEditGroup)} />
                    </div>
                    <div className="flex gap-1">
                      <input required value={editGroupForm.slug} onChange={(e) => setEditGroupForm((f) => ({ ...f, slug: e.target.value }))} className="w-28 border border-stone-200 rounded-lg px-2 py-1.5 text-sm" />
                      <AIBtn field="slug" busy={busyEditGroup} disabled={!editGroupForm.name && !editGroupForm.name_th}
                        onSuggest={() => suggestField("slug", { name: editGroupForm.name, name_th: editGroupForm.name_th }, (v) => setEditGroupForm((f) => ({ ...f, slug: v })), setBusyEditGroup)} />
                    </div>
                    <button type="submit" className="text-xs px-3 py-1.5 bg-violet-500 text-white rounded-lg">บันทึก</button>
                    <button type="button" onClick={() => setEditGroupId(null)} className="text-xs px-3 py-1.5 border border-stone-200 text-stone-600 rounded-lg">ยกเลิก</button>
                  </form>
                ) : (
                  <div key={g.id} className="flex items-center justify-between px-3 py-2 bg-violet-50 border border-violet-100 rounded-xl">
                    <span className="text-sm text-violet-700 font-medium">{g.icon} {g.name_th || g.name} <span className="text-xs text-violet-400 font-normal ml-1">{g.name_th ? g.name : ""}</span></span>
                    <div className="flex gap-1.5">
                      <button onClick={() => startEditGroup(g)} className="text-xs px-2.5 py-1 rounded-lg border border-violet-200 text-violet-600 hover:bg-violet-100">แก้ไข</button>
                      <button onClick={() => handleDeleteGroup(g)} className="text-xs px-2.5 py-1 rounded-lg border border-red-100 text-red-500 hover:bg-red-50">ลบ</button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Add Form */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-stone-100 p-5">
            <h2 className="font-semibold text-stone-800 mb-4">เพิ่มหมวดหมู่ใหม่</h2>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">ชื่อ EN *</label>
                <div className="flex gap-1.5">
                  <input required value={newForm.name} onChange={(e) => setNewForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Pet Food" className={inputCls} />
                  <AIBtn field="name_en" busy={busyNew} disabled={!newForm.name_th}
                    onSuggest={() => suggestField("name_en", { name_th: newForm.name_th }, (v) => setNewForm((f) => ({ ...f, name: v })), setBusyNew)} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">ชื่อไทย</label>
                <div className="flex gap-1.5">
                  <input value={newForm.name_th} onChange={(e) => setNewForm((f) => ({ ...f, name_th: e.target.value }))} placeholder="เช่น อาหารสัตว์" className={inputCls} />
                  <AIBtn field="name_th" busy={busyNew} disabled={!newForm.name}
                    onSuggest={() => suggestField("name_th", { name: newForm.name }, (v) => setNewForm((f) => ({ ...f, name_th: v })), setBusyNew)} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Slug</label>
                <div className="flex gap-1.5">
                  <input required value={newForm.slug} onChange={(e) => setNewForm((f) => ({ ...f, slug: e.target.value }))} placeholder="pet-food" className={inputCls} />
                  <AIBtn field="slug" busy={busyNew} disabled={!newForm.name && !newForm.name_th}
                    onSuggest={() => suggestField("slug", { name: newForm.name, name_th: newForm.name_th }, (v) => setNewForm((f) => ({ ...f, slug: v })), setBusyNew)} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">ไอคอน</label>
                <div className="flex gap-1.5">
                  <input value={newForm.icon} onChange={(e) => setNewForm((f) => ({ ...f, icon: e.target.value }))} placeholder="🐾" className={inputCls} />
                  <AIBtn field="icon" busy={busyNew} disabled={!newForm.name && !newForm.name_th}
                    onSuggest={() => suggestField("icon", { name: newForm.name, name_th: newForm.name_th }, (v) => setNewForm((f) => ({ ...f, icon: v })), setBusyNew)} />
                </div>
              </div>
              {groups.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">กลุ่ม</label>
                  <select value={newForm.groupId} onChange={(e) => setNewForm((f) => ({ ...f, groupId: e.target.value }))}
                    className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white">
                    <option value="">— ไม่มีกลุ่ม —</option>
                    {groups.map((g) => <option key={g.id} value={g.id}>{g.icon} {g.name_th || g.name}</option>)}
                  </select>
                </div>
              )}
              <button type="submit" disabled={adding}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-60">
                {adding ? "กำลังเพิ่ม..." : "+ เพิ่มหมวดหมู่"}
              </button>
            </form>
          </div>
        </div>

        {/* Table with DnD */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
            {loading ? (
              <div className="text-center py-16 text-stone-400 text-sm">กำลังโหลด...</div>
            ) : (
              <>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-100 bg-stone-50">
                      <th className="w-6 px-3 py-3" />
                      <th className="text-left px-3 py-3 text-stone-500 font-medium">หมวดหมู่</th>
                      <th className="text-left px-3 py-3 text-stone-500 font-medium hidden sm:table-cell">กลุ่ม</th>
                      <th className="text-left px-3 py-3 text-stone-500 font-medium hidden lg:table-cell">Slug</th>
                      <th className="text-right px-3 py-3 text-stone-500 font-medium">สินค้า</th>
                      <th className="px-3 py-3" />
                    </tr>
                  </thead>
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={categories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                      <tbody className="divide-y divide-stone-50">
                        {grouped.map(({ group, cats }) => (
                          <>
                            {group && (
                              <tr key={`grp-${group.id}`} className="bg-violet-50">
                                <td />
                                <td colSpan={5} className="px-3 py-1.5">
                                  <span className="text-xs font-semibold text-violet-600">{group.icon} {group.name_th || group.name}</span>
                                </td>
                              </tr>
                            )}
                            {cats.map((cat) =>
                              editCat?.id === cat.id ? (
                                <tr key={cat.id} className="bg-orange-50">
                                  <td />
                                  <td colSpan={5} className="px-3 py-2">
                                    <form onSubmit={handleEdit} className="flex flex-wrap gap-1.5 items-center">
                                      <div className="flex gap-1">
                                        <input value={editForm.icon} onChange={(e) => setEditForm((f) => ({ ...f, icon: e.target.value }))} placeholder="🐾" className="w-10 border border-stone-200 rounded-lg px-2 py-1.5 text-sm text-center" />
                                        <AIBtn field="icon" busy={busyEdit} onSuggest={() => suggestField("icon", { name: editForm.name, name_th: editForm.name_th }, (v) => setEditForm((f) => ({ ...f, icon: v })), setBusyEdit)} />
                                      </div>
                                      <div className="flex gap-1">
                                        <input required value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} placeholder="EN" className="w-24 border border-stone-200 rounded-lg px-2 py-1.5 text-sm" />
                                        <AIBtn field="name_en" busy={busyEdit} disabled={!editForm.name_th} onSuggest={() => suggestField("name_en", { name_th: editForm.name_th }, (v) => setEditForm((f) => ({ ...f, name: v })), setBusyEdit)} />
                                      </div>
                                      <div className="flex gap-1">
                                        <input value={editForm.name_th} onChange={(e) => setEditForm((f) => ({ ...f, name_th: e.target.value }))} placeholder="ไทย" className="w-24 border border-stone-200 rounded-lg px-2 py-1.5 text-sm" />
                                        <AIBtn field="name_th" busy={busyEdit} disabled={!editForm.name} onSuggest={() => suggestField("name_th", { name: editForm.name }, (v) => setEditForm((f) => ({ ...f, name_th: v })), setBusyEdit)} />
                                      </div>
                                      <div className="flex gap-1">
                                        <input required value={editForm.slug} onChange={(e) => setEditForm((f) => ({ ...f, slug: e.target.value }))} className="w-24 border border-stone-200 rounded-lg px-2 py-1.5 text-sm" />
                                        <AIBtn field="slug" busy={busyEdit} disabled={!editForm.name && !editForm.name_th} onSuggest={() => suggestField("slug", { name: editForm.name, name_th: editForm.name_th }, (v) => setEditForm((f) => ({ ...f, slug: v })), setBusyEdit)} />
                                      </div>
                                      {groups.length > 0 && (
                                        <select value={editForm.groupId} onChange={(e) => setEditForm((f) => ({ ...f, groupId: e.target.value }))}
                                          className="border border-stone-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none">
                                          <option value="">— ไม่มีกลุ่ม —</option>
                                          {groups.map((g) => <option key={g.id} value={g.id}>{g.icon} {g.name_th || g.name}</option>)}
                                        </select>
                                      )}
                                      <button type="submit" className="text-xs px-3 py-1.5 bg-orange-500 text-white rounded-lg">บันทึก</button>
                                      <button type="button" onClick={() => setEditCat(null)} className="text-xs px-3 py-1.5 border border-stone-200 text-stone-600 rounded-lg">ยกเลิก</button>
                                    </form>
                                  </td>
                                </tr>
                              ) : (
                                <SortableRow key={cat.id} cat={cat} groups={groups} onEdit={startEdit} onDelete={handleDelete} onGroupChange={handleGroupChange} />
                              )
                            )}
                          </>
                        ))}
                      </tbody>
                    </SortableContext>
                  </DndContext>
                </table>
                <p className="text-center text-xs text-stone-300 py-2">⠿ ลากเพื่อเรียงลำดับ</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
