"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

type NavItem = { href: string; label: string; icon: string; exact?: boolean };
type NavGroup = { label: string; icon: string; items: NavItem[] };
type NavEntry = NavItem | NavGroup;

function isGroup(e: NavEntry): e is NavGroup {
  return "items" in e;
}

const navEntries: NavEntry[] = [
  { href: "/admin", label: "Dashboard", icon: "📊", exact: true },
  { href: "/admin/analytics", label: "Analytics", icon: "📈" },
  { href: "/admin/products", label: "สินค้า", icon: "📦" },
  { href: "/admin/shelves", label: "Product Shelves", icon: "🗂️" },
  {
    label: "นำเข้าสินค้า",
    icon: "📥",
    items: [
      { href: "/admin/cj-import", label: "CJ Dropshipping", icon: "🚚" },
    ],
  },
  { href: "/admin/orders", label: "คำสั่งซื้อ", icon: "🛒" },
  { href: "/admin/coupons", label: "คูปอง", icon: "🎟️" },
  { href: "/admin/banners", label: "Hero Banner", icon: "🖼️" },
  { href: "/admin/articles", label: "บทความ", icon: "📝" },
  { href: "/admin/stores", label: "สาขา", icon: "📍" },
  {
    label: "หมวดหมู่",
    icon: "🏷️",
    items: [
      { href: "/admin/categories", label: "หมวดหมู่", icon: "🏷️" },
      { href: "/admin/pet-types", label: "ประเภทสัตว์", icon: "🐾" },
      { href: "/admin/tags", label: "แท็กสินค้า", icon: "🔖" },
    ],
  },
  { href: "/admin/users", label: "ผู้ใช้งาน", icon: "👥" },
  {
    label: "ระบบ",
    icon: "⚙️",
    items: [
      { href: "/admin/settings", label: "ตั้งค่าร้าน", icon: "⚙️" },
      { href: "/admin/system-integration", label: "System Integration", icon: "🔌" },
      { href: "/admin/cj-logs", label: "CJ Logs", icon: "📋" },
    ],
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(["นำเข้าสินค้า"]));

  // Auto-expand group containing the active path
  useEffect(() => {
    navEntries.forEach((entry) => {
      if (isGroup(entry) && entry.items.some((i) => pathname.startsWith(i.href))) {
        setOpenGroups((prev) => new Set([...prev, entry.label]));
      }
    });
  }, [pathname]);

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  };

  const isItemActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <aside className="w-56 shrink-0 bg-white border-r border-stone-200 flex flex-col">
      <div className="h-16 flex items-center px-5 border-b border-stone-100">
        <Link href="/admin" className="flex items-center gap-2">
          <span className="text-xl">🐾</span>
          <div>
            <p className="font-bold text-stone-800 text-sm leading-tight">PetShop</p>
            <p className="text-xs text-orange-500 font-medium">Admin CMS</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navEntries.map((entry) => {
          if (isGroup(entry)) {
            const isOpen = openGroups.has(entry.label);
            const hasActive = entry.items.some((i) => pathname.startsWith(i.href));
            return (
              <div key={entry.label}>
                <button
                  onClick={() => toggleGroup(entry.label)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    hasActive
                      ? "text-orange-600 bg-orange-50"
                      : "text-stone-600 hover:bg-stone-50 hover:text-stone-800"
                  }`}
                >
                  <span className="text-base">{entry.icon}</span>
                  <span className="flex-1 text-left">{entry.label}</span>
                  <span
                    className={`text-xs transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  >
                    ▾
                  </span>
                </button>
                {isOpen && (
                  <div className="mt-0.5 mb-1">
                    {entry.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 pl-8 pr-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                          isItemActive(item.href, item.exact)
                            ? "bg-orange-50 text-orange-600"
                            : "text-stone-500 hover:bg-stone-50 hover:text-stone-700"
                        }`}
                      >
                        <span>{item.icon}</span>
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={entry.href}
              href={entry.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isItemActive(entry.href, entry.exact)
                  ? "bg-orange-50 text-orange-600"
                  : "text-stone-600 hover:bg-stone-50 hover:text-stone-800"
              }`}
            >
              <span className="text-base">{entry.icon}</span>
              {entry.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-4 border-t border-stone-100 pt-3">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-stone-500 hover:bg-stone-50 hover:text-stone-700 transition-colors"
        >
          <span>🌐</span>
          กลับหน้าเว็บ
        </Link>
      </div>
    </aside>
  );
}
