"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useShopAdmin } from "@/context/ShopAdminContext";

type NavItem = { href: string; label: string; icon: string; exact?: boolean; adminOnly?: boolean; minRole?: string };
type NavGroup = { label: string; icon: string; items: NavItem[]; adminOnly?: boolean; minRole?: string };
type NavEntry = NavItem | NavGroup;

function isGroup(e: NavEntry): e is NavGroup {
  return "items" in e;
}

const ROLE_LEVEL: Record<string, number> = { STAFF: 1, MANAGER: 2, OWNER: 3 };

const navEntries: NavEntry[] = [
  { href: "/admin", label: "Dashboard", icon: "📊", exact: true },
  { href: "/admin/analytics", label: "Analytics", icon: "📈", minRole: "MANAGER" },
  { href: "/admin/shops", label: "Shops", icon: "🏪", adminOnly: true },
  {
    label: "สินค้า",
    icon: "📦",
    minRole: "MANAGER",
    items: [
      { href: "/admin/products", label: "สินค้าทั้งหมด", icon: "📦" },
      { href: "/admin/variants", label: "Variants", icon: "🔀" },
      { href: "/admin/shelves", label: "Product Shelves", icon: "🗂️" },
      { href: "/admin/categories", label: "หมวดหมู่", icon: "🏷️" },
      { href: "/admin/pet-types", label: "ประเภทสัตว์", icon: "🐾" },
      { href: "/admin/tags", label: "แท็กสินค้า", icon: "🔖" },
    ],
  },
  {
    label: "นำเข้าสินค้า",
    icon: "📥",
    minRole: "MANAGER",
    items: [
      { href: "/admin/cj-import", label: "CJ Dropshipping", icon: "🚚" },
    ],
  },
  { href: "/admin/orders", label: "คำสั่งซื้อ", icon: "🛒" },
  { href: "/admin/coupons", label: "คูปอง", icon: "🎟️", minRole: "MANAGER" },
  {
    label: "เนื้อหาหน้าเว้บ",
    icon: "🌐",
    minRole: "MANAGER",
    items: [
      { href: "/admin/banners", label: "Hero Banner", icon: "🖼️" },
      { href: "/admin/articles", label: "บทความ", icon: "📝" },
      { href: "/admin/stores", label: "สาขา", icon: "📍" },
    ],
  },
  { href: "/admin/staff", label: "Shop Staff", icon: "👤", minRole: "OWNER" },
  { href: "/admin/users", label: "ผู้ใช้งาน", icon: "👥", adminOnly: true },
  {
    label: "ระบบ",
    icon: "⚙️",
    minRole: "OWNER",
    items: [
      { href: "/admin/settings", label: "ตั้งค่าร้าน", icon: "⚙️" },
      { href: "/admin/system-integration", label: "System Integration", icon: "🔌", adminOnly: true },
      { href: "/admin/api-logs", label: "API & Webhook Logs", icon: "🗂️", adminOnly: true },
      { href: "/admin/cj-logs", label: "CJ Logs", icon: "📋" },
    ],
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { activeShop, shops, setActiveShopId, isAdmin, shopRole, loading } = useShopAdmin();
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(["สินค้า", "นำเข้าสินค้า", "เนื้อหาหน้าเว้บ"]));

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

  const userLevel = isAdmin ? 99 : ROLE_LEVEL[shopRole ?? ""] ?? 0;

  const canSee = (entry: { adminOnly?: boolean; minRole?: string }) => {
    if (entry.adminOnly && !isAdmin) return false;
    if (entry.minRole && userLevel < (ROLE_LEVEL[entry.minRole] ?? 0)) return false;
    return true;
  };

  const visibleEntries = navEntries.filter((entry) => {
    if (!canSee(entry)) return false;
    if (isGroup(entry)) {
      // Show group if at least one child is visible
      return entry.items.some((item) => canSee(item));
    }
    return true;
  });

  return (
    <aside className="w-56 shrink-0 bg-white border-r border-stone-200 flex flex-col">
      {/* Shop Switcher Header */}
      <div className="border-b border-stone-100 px-3 py-3">
        {loading ? (
          <div className="h-10 bg-stone-50 rounded-xl animate-pulse" />
        ) : shops.length <= 1 ? (
          <Link href="/admin" className="flex items-center gap-2 px-2">
            <span className="text-xl">🐾</span>
            <div>
              <p className="font-bold text-stone-800 text-sm leading-tight truncate">
                {activeShop?.name ?? "PetShop"}
              </p>
              <p className="text-xs text-orange-500 font-medium">Admin CMS</p>
            </div>
          </Link>
        ) : (
          <select
            value={activeShop?.id ?? ""}
            onChange={(e) => {
              setActiveShopId(e.target.value);
              window.location.reload();
            }}
            className="w-full text-sm font-medium text-stone-800 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-orange-300 focus:border-orange-300"
          >
            {shops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visibleEntries.map((entry) => {
          if (isGroup(entry)) {
            const visibleItems = entry.items.filter((item) => canSee(item));
            const isOpen = openGroups.has(entry.label);
            const hasActive = visibleItems.some((i) => pathname.startsWith(i.href));
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
                    {visibleItems.map((item) => (
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
