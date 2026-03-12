"use client";

import { useRef, useState } from "react";
import Image from "next/image";
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
  horizontalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableImageThumb({
  id,
  url,
  onRemove,
}: {
  id: number;
  url: string;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const isValid = (() => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  })();

  return (
    <div ref={setNodeRef} style={style} className="relative group flex flex-col items-center gap-1">
      <div
        {...attributes}
        {...listeners}
        className="relative w-20 h-20 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-amber-300 transition-shadow"
        title="ลากเพื่อจัดลำดับ"
      >
        {isValid ? (
          <Image src={url} alt="" fill className="object-cover" sizes="80px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-stone-400 text-center px-1">
            URL ไม่ถูกต้อง
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="w-6 h-6 rounded bg-red-100 hover:bg-red-200 text-red-600 text-xs flex items-center justify-center"
        title="ลบ"
      >
        ✕
      </button>
    </div>
  );
}

interface SupplierProductImageFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export function SupplierProductImageField({ value, onChange }: SupplierProductImageFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const imageList = value
    .split(/[\s,]+/)
    .map((u) => u.trim())
    .filter(Boolean);

  const uploadFile = async (file: File): Promise<string | null> => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (!data.success) {
      toast.error(data.error ?? "อัปโหลดไม่สำเร็จ");
      return null;
    }
    return data.url as string;
  };

  const handleFiles = async (files: FileList | File[]) => {
    setUploading(true);
    const newUrls: string[] = [];
    for (const file of Array.from(files)) {
      const url = await uploadFile(file);
      if (url) newUrls.push(url);
    }
    setUploading(false);
    if (newUrls.length > 0) {
      onChange(value ? `${value}, ${newUrls.join(", ")}` : newUrls.join(", "));
      toast.success(`อัปโหลดสำเร็จ ${newUrls.length} รูป`);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  };

  const removeImage = (idx: number) => {
    onChange(imageList.filter((_, i) => i !== idx).join(", "));
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleImageDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = Number(active.id);
    const newIndex = Number(over.id);
    const reordered = arrayMove(imageList, oldIndex, newIndex);
    onChange(reordered.join(", "));
  };

  return (
    <div>
      <label className="block text-xs font-semibold text-stone-600 mb-1.5">รูปภาพสินค้า</label>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
          dragOver
            ? "border-amber-400 bg-amber-50"
            : "border-stone-200 hover:border-amber-300 hover:bg-stone-50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-amber-500">กำลังอัปโหลด...</p>
          </div>
        ) : (
          <>
            <p className="text-xl mb-1">🖼️</p>
            <p className="text-sm font-medium text-stone-600">คลิกหรือลากไฟล์มาวางที่นี่</p>
            <p className="text-xs text-stone-400 mt-0.5">JPG, PNG, WebP — ไม่เกิน 5MB ต่อไฟล์</p>
          </>
        )}
      </div>

      {imageList.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleImageDragEnd}
        >
          <SortableContext
            items={imageList.map((_, i) => i)}
            strategy={horizontalListSortingStrategy}
          >
            <div className="flex flex-wrap gap-2 mt-3">
              {imageList.map((url, i) => (
                <SortableImageThumb
                  key={i}
                  id={i}
                  url={url}
                  onRemove={() => removeImage(i)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <div className="mt-2">
        <p className="text-xs text-stone-400 mb-1">หรือใส่ URL โดยตรง (คั่นด้วยคอมมา หรือ space)</p>
        <textarea
          rows={2}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://example.com/img1.jpg, https://example.com/img2.jpg"
          className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm font-mono resize-none"
        />
      </div>
    </div>
  );
}
