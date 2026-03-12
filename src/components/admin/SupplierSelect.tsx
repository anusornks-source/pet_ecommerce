"use client";

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";

export interface SupplierOption {
  id: string;
  name: string;
  nameTh: string | null;
  imageUrl: string | null;
}

interface SupplierSelectProps {
  value: string;
  onChange: (supplierId: string, supplier?: SupplierOption) => void;
  selectedSupplier?: SupplierOption | null;
  detailLink?: string;
  detailLinkLabel?: string;
  placeholder?: string;
  className?: string;
}

export function SupplierSelect({
  value,
  onChange,
  selectedSupplier,
  detailLink,
  detailLinkLabel = "แก้ไขรูป Supplier → หน้า Supplier Detail",
  placeholder = "ค้นหา supplier...",
  className = "",
}: SupplierSelectProps) {
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<SupplierOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [fetchingSelected, setFetchingSelected] = useState(false);
  const [displaySupplier, setDisplaySupplier] = useState<SupplierOption | null>(selectedSupplier ?? null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);

  // Sync display จาก selectedSupplier เฉพาะเมื่อ id ตรงกับ value (ป้องกัน overwrite หลังเลือก supplier ใหม่)
  useEffect(() => {
    if (selectedSupplier && selectedSupplier.id === value) setDisplaySupplier(selectedSupplier);
  }, [selectedSupplier, value]);

  // Fetch selected supplier when value is set but we don't have displaySupplier
  useEffect(() => {
    if (!value || displaySupplier?.id === value) return;
    setFetchingSelected(true);
    fetch(`/api/admin/suppliers/${value}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          const s = d.data;
          setDisplaySupplier({
            id: s.id,
            name: s.name,
            nameTh: s.nameTh ?? null,
            imageUrl: s.imageUrl ?? null,
          });
        }
      })
      .finally(() => setFetchingSelected(false));
  }, [value]);

  const loadSuppliers = async (q: string) => {
    setLoading(true);
    try {
      const url = q.trim()
        ? `/api/admin/suppliers?search=${encodeURIComponent(q)}&limit=30&minimal=true`
        : `/api/admin/suppliers?limit=50&minimal=true`;
      const res = await fetch(url);
      const data = await res.json();
      setOptions(data.data ?? []);
    } finally {
      setLoading(false);
    }
  };

  const doSearch = (q: string) => {
    setSearch(q);
    if (timerRef.current) clearTimeout(timerRef.current);
    setOpen(true);
    timerRef.current = setTimeout(() => loadSuppliers(q), q.trim() ? 250 : 0);
  };

  const openAndLoad = () => {
    setOpen(true);
    if (options.length === 0 && !loading) loadSuppliers(search);
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      const inWrap = wrapRef.current?.contains(target);
      const inDropdown = dropdownRef.current?.contains(target);
      if (!inWrap && !inDropdown) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useLayoutEffect(() => {
    if (!open || !wrapRef.current) {
      setDropdownRect(null);
      return;
    }
    const update = () => {
      if (wrapRef.current) {
        const r = wrapRef.current.getBoundingClientRect();
        setDropdownRect({ top: r.bottom + 4, left: r.left, width: r.width });
      }
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, loading, options.length]);

  const handleSelect = (s: SupplierOption) => {
    onChange(s.id, s);
    setDisplaySupplier(s);
    setSearch("");
    setOptions([]);
    setOpen(false);
  };

  const showSearch = open || !value;
  const displayName = displaySupplier?.nameTh ?? displaySupplier?.name ?? "";

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      {showSearch ? (
        <div className="space-y-1">
          <div className="flex gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => doSearch(e.target.value)}
              onMouseDown={openAndLoad}
              onFocus={openAndLoad}
              placeholder={placeholder}
              className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
              autoComplete="off"
            />
            {value && (
              <button
                type="button"
                onClick={() => { setOpen(false); setSearch(""); setOptions([]); }}
                className="shrink-0 px-2 py-1 text-xs text-stone-500 hover:text-stone-700 border border-stone-200 rounded-lg"
              >
                ยกเลิก
              </button>
            )}
          </div>
          {open && (() => {
            const content = (
              <div
                ref={(el) => { dropdownRef.current = el; }}
                className="bg-white border border-stone-200 rounded-xl shadow-lg z-[9999] overflow-y-auto overscroll-contain"
                style={{
                  ...(dropdownRect
                    ? { position: "fixed" as const, top: dropdownRect.top, left: dropdownRect.left, width: dropdownRect.width }
                    : { position: "absolute" as const, top: "100%", left: 0, right: 0, marginTop: 4 }
                  ),
                  maxHeight: "280px",
                }}
              >
                {loading ? (
                  <div className="px-4 py-3 text-sm text-stone-400">กำลังโหลด...</div>
                ) : options.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-stone-400">{search.trim() ? "ไม่พบ supplier" : "ยังไม่มี supplier"}</div>
                ) : (
                  options.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSelect(s);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-orange-50 text-left"
                    >
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-stone-100 shrink-0">
                        {s.imageUrl ? (
                          <Image src={s.imageUrl} alt="" fill className="object-cover" unoptimized />
                        ) : (
                          <div className="flex items-center justify-center h-full text-stone-400 text-lg">🏪</div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-stone-800 truncate">{s.nameTh ?? s.name}</p>
                        {s.nameTh && s.name !== s.nameTh && (
                          <p className="text-xs text-stone-400 truncate">{s.name}</p>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            );
            return dropdownRect && typeof document !== "undefined"
              ? createPortal(content, document.body)
              : content;
          })()}
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-stone-100 shrink-0">
            {fetchingSelected ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : displaySupplier?.imageUrl ? (
              <Image src={displaySupplier.imageUrl} alt="" fill className="object-cover" unoptimized />
            ) : (
              <div className="flex items-center justify-center h-full text-stone-400 text-xl">🏪</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <button
              type="button"
              onClick={openAndLoad}
              className="w-full text-left border border-stone-200 rounded-lg px-3 py-2 text-sm hover:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200"
            >
              {displaySupplier ? (displaySupplier.nameTh ?? displaySupplier.name) : "เลือก supplier"}
            </button>
            {detailLink && value && (
              <Link
                href={detailLink}
                className="text-xs text-stone-500 hover:text-orange-600 mt-0.5 block"
              >
                {detailLinkLabel}
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
