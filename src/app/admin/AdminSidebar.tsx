"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useShopAdmin } from "@/context/ShopAdminContext";
import { useLocale } from "@/context/LocaleContext";

type NavItem = { href: string; labelKey: string; icon: string; exact?: boolean; adminOnly?: boolean; minRole?: string };
type NavGroup = { labelKey: string; icon: string; items: NavItem[]; adminOnly?: boolean; minRole?: string };
type NavEntry = NavItem | NavGroup;

function isGroup(e: NavEntry): e is NavGroup {
  return "items" in e;
}

const ROLE_LEVEL: Record<string, number> = { STAFF: 1, MANAGER: 2, OWNER: 3 };

const navEntries: NavEntry[] = [
  { href: "/admin", labelKey: "dashboard", icon: "📊", exact: true },
  { href: "/admin/analytics", labelKey: "analytics", icon: "📈", minRole: "MANAGER" },
  { href: "/admin/shops", labelKey: "shops", icon: "🏪", adminOnly: true },
  {
    labelKey: "products",
    icon: "📦",
    minRole: "MANAGER",
    items: [
      { href: "/admin/products", labelKey: "allProducts", icon: "📦" },
      { href: "/admin/variants", labelKey: "variants", icon: "🔀" },
      { href: "/admin/shelves", labelKey: "shelves", icon: "🗂️" },
      { href: "/admin/categories", labelKey: "categories", icon: "🏷️", adminOnly: true },
      { href: "/admin/shop-categories", labelKey: "shopCategories", icon: "🏷️" },
      { href: "/admin/pet-types", labelKey: "petTypes", icon: "🐾" },
      { href: "/admin/tags", labelKey: "tags", icon: "🔖" },
    ],
  },
  {
    labelKey: "suppliers",
    icon: "🏭",
    minRole: "MANAGER",
    items: [
      { href: "/admin/suppliers", labelKey: "suppliers", icon: "🏭" },
      { href: "/admin/supplier-products", labelKey: "supplierProducts", icon: "📦" },
    ],
  },
  {
    labelKey: "importProducts",
    icon: "📥",
    minRole: "MANAGER",
    items: [
      { href: "/admin/cj-import", labelKey: "cjDropshipping", icon: "🚚" },
    ],
  },
  {
    labelKey: "marketingAuto",
    icon: "🤖",
    minRole: "MANAGER",
    items: [
      { href: "/admin/automation/research", labelKey: "productResearch", icon: "🔬" },
      { href: "/admin/automation/pain-points", labelKey: "painPointBank", icon: "🎯" },
      { href: "/admin/automation/niche-keywords", labelKey: "nicheKeywords", icon: "🗃️" },
      { href: "/admin/automation/trend-pipeline", labelKey: "trendPipeline", icon: "🔥" },
      { href: "/admin/automation/creative", labelKey: "creativeStudio", icon: "✨" },
      { href: "/admin/automation/marketing-packs", labelKey: "marketingPacks", icon: "📦" },
    ],
  },
  { href: "/admin/orders", labelKey: "orders", icon: "🛒" },
  { href: "/admin/abandoned-carts", labelKey: "abandonedCarts", icon: "🛒", minRole: "MANAGER" },
  { href: "/admin/coupons", labelKey: "coupons", icon: "🎟️", minRole: "MANAGER" },
  { href: "/admin/shops/__active__", labelKey: "shopInfo", icon: "🏪", minRole: "OWNER" },
  {
    labelKey: "webContent",
    icon: "🌐",
    minRole: "MANAGER",
    items: [
      { href: "/admin/banners", labelKey: "heroBanner", icon: "🖼️" },
      { href: "/admin/articles", labelKey: "articles", icon: "📝" },
      { href: "/admin/stores", labelKey: "stores", icon: "📍" },
    ],
  },
  { href: "/admin/staff", labelKey: "staff", icon: "👤", minRole: "OWNER" },
  { href: "/admin/users", labelKey: "users", icon: "👥", adminOnly: true },
  {
    labelKey: "system",
    icon: "⚙️",
    minRole: "OWNER",
    items: [
      { href: "/admin/site-settings", labelKey: "siteSettings", icon: "🌐", adminOnly: true },
      { href: "/admin/settings", labelKey: "settings", icon: "⚙️" },
      { href: "/admin/system-integration", labelKey: "systemIntegration", icon: "🔌", adminOnly: true },
      { href: "/admin/api-logs", labelKey: "apiLogs", icon: "🗂️", adminOnly: true },
      { href: "/admin/cj-logs", labelKey: "cjLogs", icon: "📋" },
    ],
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { activeShop, shops, setActiveShopId, isAdmin, shopRole, loading } = useShopAdmin();
  const { t, lang, toggle } = useLocale();
  const getLabel = (key: string) => t(key, "adminMenu");
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(["products", "suppliers", "importProducts", "webContent", "marketingAuto"]));

  useEffect(() => {
    navEntries.forEach((entry) => {
      if (isGroup(entry) && entry.items.some((i) => pathname.startsWith(i.href))) {
        setOpenGroups((prev) => new Set([...prev, entry.labelKey]));
      }
    });
  }, [pathname]);

  const toggleGroup = (labelKey: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      next.has(labelKey) ? next.delete(labelKey) : next.add(labelKey);
      return next;
    });
  };

  const resolveHref = (href: string) =>
    href.includes("__active__") && activeShop ? href.replace("__active__", activeShop.id) : href;

  const isItemActive = (href: string, exact?: boolean) => {
    const resolved = resolveHref(href);
    return exact ? pathname === resolved : pathname.startsWith(resolved);
  };

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
            const isOpen = openGroups.has(entry.labelKey);
            const hasActive = visibleItems.some((i) => pathname.startsWith(i.href));
            return (
              <div key={entry.labelKey}>
                <button
                  onClick={() => toggleGroup(entry.labelKey)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                    hasActive
                      ? "text-orange-600 bg-orange-50"
                      : "text-stone-600 hover:bg-stone-50 hover:text-stone-800"
                  }`}
                >
                  <span className="text-base">{entry.icon}</span>
                  <span className="flex-1 text-left">{getLabel(entry.labelKey)}</span>
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
                        href={resolveHref(item.href)}
                        className={`flex items-center gap-3 pl-8 pr-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                          isItemActive(item.href, item.exact)
                            ? "bg-orange-50 text-orange-600"
                            : "text-stone-500 hover:bg-stone-50 hover:text-stone-700"
                        }`}
                      >
                        <span>{item.icon}</span>
                        {getLabel(item.labelKey)}
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
              href={resolveHref(entry.href)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                isItemActive(entry.href, entry.exact)
                  ? "bg-orange-50 text-orange-600"
                  : "text-stone-600 hover:bg-stone-50 hover:text-stone-800"
              }`}
            >
              <span className="text-base">{entry.icon}</span>
              {getLabel(entry.labelKey)}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-4 border-t border-stone-100 pt-3 space-y-1">
        <button
          type="button"
          onClick={toggle}
          className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-xs text-stone-500 hover:bg-stone-50 hover:text-stone-700 transition-colors"
        >
          <span>🌐</span>
          <span>{lang === "th" ? "TH" : "EN"}</span>
        </button>
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-stone-500 hover:bg-stone-50 hover:text-stone-700 transition-colors"
        >
          <span>🌐</span>
          {getLabel("backToSite")}
        </Link>
      </div>
    </aside>
  );
}
