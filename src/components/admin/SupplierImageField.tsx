"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import toast from "react-hot-toast";

interface SupplierImageFieldProps {
  value: string;
  supplierId: string;
  onChange: (url: string) => void;
  onSave: (url: string) => Promise<void>;
  disabled?: boolean;
}

export function SupplierImageField({
  value,
  supplierId,
  onChange,
  onSave,
  disabled,
}: SupplierImageFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);

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

  const handleFile = async (file: File) => {
    if (!supplierId) {
      toast.error("กรุณาเลือก Supplier ก่อน");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadFile(file);
      if (url) {
        setSaving(true);
        await onSave(url);
        onChange(url);
        toast.success("เพิ่มรูป Supplier แล้ว");
      }
    } finally {
      setUploading(false);
      setSaving(false);
    }
  };

  const handleFiles = async (files: FileList | File[]) => {
    const file = Array.from(files)[0];
    if (file && file.type.startsWith("image/")) await handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  };

  return (
    <div>
      <label className="block text-xs font-semibold text-stone-600 mb-1.5">รูป Supplier</label>
      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors ${
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
        } ${
          dragOver && !disabled
            ? "border-amber-400 bg-amber-50"
            : "border-stone-200 hover:border-amber-300 hover:bg-stone-50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFiles(e.target.files)}
        />
        {uploading || saving ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-amber-500">กำลังอัปโหลด...</p>
          </div>
        ) : value ? (
          <div className="relative w-20 h-20 mx-auto rounded-xl overflow-hidden bg-stone-100 group">
            <Image src={value} alt="" fill className="object-cover" sizes="80px" unoptimized />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-xs font-medium">คลิกเพื่อเปลี่ยนรูป</span>
            </div>
          </div>
        ) : (
          <>
            <p className="text-xl mb-1">🏪</p>
            <p className="text-sm font-medium text-stone-600">คลิกหรือลากไฟล์มาวางที่นี่</p>
            <p className="text-xs text-stone-400 mt-0.5">JPG, PNG, WebP — ไม่เกิน 5MB ต่อไฟล์</p>
          </>
        )}
      </div>
    </div>
  );
}
