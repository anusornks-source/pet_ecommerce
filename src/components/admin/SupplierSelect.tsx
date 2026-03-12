"use client";

import { useState, useRef, useEffect } from "react";
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

  // Sync display when selectedSupplier prop changes
  useEffect(() => {
    if (selectedSupplier) setDisplaySupplier(selectedSupplier);
  }, [selectedSupplier]);

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

  const doSearch = (q: string) => {
    setSearch(q);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!q.trim()) {
      setOptions([]);
      return;
    }
    setOpen(true);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/admin/suppliers?search=${encodeURIComponent(q)}&limit=30&minimal=true`
        );
        const data = await res.json();
        setOptions(data.data ?? []);
      } finally {
        setLoading(false);
      }
    }, 250);
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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
              onFocus={() => search && setOpen(true)}
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
          {open && (search.trim() || loading) && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-xl shadow-lg z-20 max-h-56 overflow-y-auto">
              {loading ? (
                <div className="px-4 py-3 text-sm text-stone-400">กำลังค้นหา...</div>
              ) : options.length === 0 && search.trim() ? (
                <div className="px-4 py-3 text-sm text-stone-400">ไม่พบ supplier</div>
              ) : (
                options.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSelect(s)}
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
          )}
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
              onClick={() => setOpen(true)}
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
