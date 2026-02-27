"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: "📊", exact: true },
  { href: "/admin/analytics", label: "Analytics", icon: "📈" },
  { href: "/admin/products", label: "สินค้า", icon: "📦" },
  { href: "/admin/categories", label: "หมวดหมู่", icon: "🏷️" },
  { href: "/admin/orders", label: "คำสั่งซื้อ", icon: "🛒" },
  { href: "/admin/users", label: "ผู้ใช้งาน", icon: "👥" },
  { href: "/admin/coupons", label: "คูปอง", icon: "🎟️" },
  { href: "/admin/stores", label: "สาขา", icon: "📍" },
  { href: "/admin/articles", label: "บทความ", icon: "📝" },
  { href: "/admin/settings", label: "ตั้งค่าร้าน", icon: "⚙️" },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <aside className="w-56 shrink-0 bg-white border-r border-stone-200 flex flex-col">
      <div className="h-16 flex items-center px-5 border-b border-stone-100">
        <Link href="/admin" className="flex items-center gap-2">
          <span className="text-xl">🐾</span>
          <div>
            <p className="font-bold text-stone-800 text-sm leading-tight">
              PetShop
            </p>
            <p className="text-xs text-orange-500 font-medium">Admin CMS</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              isActive(item.href, item.exact)
                ? "bg-orange-50 text-orange-600"
                : "text-stone-600 hover:bg-stone-50 hover:text-stone-800"
            }`}
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </Link>
        ))}
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
