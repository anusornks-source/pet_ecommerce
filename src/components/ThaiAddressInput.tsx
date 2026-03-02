"use client";

import { useEffect, useRef, useState } from "react";

interface AddressRecord {
  district: string;   // ตำบล/แขวง
  amphoe: string;     // อำเภอ/เขต
  province: string;   // จังหวัด
  zipcode: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelect: (addr: { district: string; amphoe: string; province: string; zipcode: string }) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

let cachedDB: AddressRecord[] | null = null;

async function loadDB(): Promise<AddressRecord[]> {
  if (cachedDB) return cachedDB;
  const res = await fetch("/api/thai-address");
  const json = await res.json();
  cachedDB = json.data ?? json;
  return cachedDB!;
}

function search(db: AddressRecord[], query: string): AddressRecord[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const results: AddressRecord[] = [];
  for (const rec of db) {
    if (
      rec.district.toLowerCase().includes(q) ||
      rec.amphoe.toLowerCase().includes(q) ||
      rec.province.toLowerCase().includes(q) ||
      rec.zipcode.includes(q)
    ) {
      results.push(rec);
      if (results.length >= 20) break;
    }
  }
  return results;
}

export default function ThaiAddressInput({ value, onChange, onSelect, placeholder = "พิมพ์แขวง/ตำบล", className, required }: Props) {
  const [db, setDB] = useState<AddressRecord[] | null>(null);
  const [results, setResults] = useState<AddressRecord[]>([]);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Load DB lazily on first focus
  const handleFocus = async () => {
    setFocused(true);
    if (!db) {
      const data = await loadDB();
      setDB(data);
      if (value) setResults(search(data, value));
    }
    setOpen(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    onChange(v);
    if (db) {
      setResults(search(db, v));
      setOpen(true);
    }
  };

  const handleSelect = (rec: AddressRecord) => {
    onSelect(rec);
    setResults([]);
    setOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        required={required}
        className={className}
        autoComplete="off"
      />
      {open && results.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-stone-200 rounded-xl shadow-lg max-h-60 overflow-y-auto text-sm">
          {results.map((rec, i) => (
            <li key={i}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()} // prevent blur before click
                onClick={() => handleSelect(rec)}
                className="w-full text-left px-4 py-2.5 hover:bg-orange-50 transition-colors border-b border-stone-50 last:border-0"
              >
                <span className="font-medium text-stone-800">{rec.district}</span>
                <span className="text-stone-400 mx-1">·</span>
                <span className="text-stone-600">{rec.amphoe}</span>
                <span className="text-stone-400 mx-1">·</span>
                <span className="text-stone-600">{rec.province}</span>
                <span className="ml-2 text-xs bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded-full">{rec.zipcode}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && focused && !db && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-stone-200 rounded-xl shadow-lg px-4 py-3 text-sm text-stone-400">
          กำลังโหลด...
        </div>
      )}
    </div>
  );
}
