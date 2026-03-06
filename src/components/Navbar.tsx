"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useLocale } from "@/context/LocaleContext";
import toast from "react-hot-toast";

interface NavbarProps {
  storeName?: string;
  logoUrl?: string;
  shopId?: string;
}

export default function Navbar({ storeName = "PetShop", logoUrl, shopId }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { cartCount } = useCart();
  const { lang, toggle, t } = useLocale();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    toast.success(lang === "th" ? "ออกจากระบบแล้ว" : "Logged out");
    router.push("/");
  };

  const navLinks = [
    { href: "/", label: t("home", "nav") },
    { href: "/products", label: t("products", "nav") },
    { href: shopId ? `/advisor?shopId=${shopId}&shopName=${encodeURIComponent(storeName)}` : "/advisor", label: t("advisor", "nav") },
    { href: "/stores", label: t("stores", "nav") },
    { href: "/articles", label: t("articles", "nav") },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-stone-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-orange-500">
          {logoUrl ? (
            <div className="relative w-8 h-8 shrink-0">
              <Image src={logoUrl} alt={storeName} fill className="object-contain" sizes="32px" />
            </div>
          ) : (
            <span className="text-2xl">🐾</span>
          )}
          <span>{storeName}</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === link.href
                  ? "text-orange-500 bg-orange-50"
                  : "text-stone-600 hover:text-orange-500 hover:bg-orange-50"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Language toggle */}
          <button
            onClick={toggle}
            className="hidden md:flex items-center gap-1 px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-semibold text-stone-600 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-600 transition-colors"
            title={lang === "th" ? "Switch to English" : "เปลี่ยนเป็นภาษาไทย"}
          >
            <span>{lang === "th" ? "🇬🇧 EN" : "🇹🇭 TH"}</span>
          </button>

          {/* Cart */}
          <Link href="/cart" className="relative p-2 rounded-xl hover:bg-orange-50 transition-colors">
            <svg className="w-6 h-6 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            )}
          </Link>

          {/* Auth */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setDropOpen(!dropOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-orange-50 transition-colors"
              >
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-sm">
                  {user.name[0].toUpperCase()}
                </div>
                <span className="hidden md:block text-sm font-medium text-stone-700">{user.name}</span>
                <svg className="w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {dropOpen && (
                <>
                  <div className="fixed inset-0" onClick={() => setDropOpen(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-stone-100 rounded-2xl shadow-lg py-1 z-50">
                    <Link
                      href="/profile"
                      onClick={() => setDropOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-stone-700 hover:bg-orange-50 hover:text-orange-500 transition-colors"
                    >
                      <span>👤</span> {t("profile", "auth")}
                    </Link>
                    <Link
                      href="/profile/orders"
                      onClick={() => setDropOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-stone-700 hover:bg-orange-50 hover:text-orange-500 transition-colors"
                    >
                      <span>📦</span> {t("orders", "auth")}
                    </Link>
                    {user.role === "ADMIN" && (
                      <Link
                        href="/admin"
                        onClick={() => setDropOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-orange-600 hover:bg-orange-50 transition-colors font-medium"
                      >
                        <span>⚙️</span> Admin CMS
                      </Link>
                    )}
                    <hr className="my-1 border-stone-100" />
                    <button
                      onClick={() => { setDropOpen(false); handleLogout(); }}
                      className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <span>🚪</span> {t("logout", "auth")}
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Link href="/login" className="btn-ghost text-sm">{t("login", "auth")}</Link>
              <Link href="/register" className="btn-primary text-sm">{t("register", "auth")}</Link>
            </div>
          )}

          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 rounded-xl hover:bg-orange-50 transition-colors"
          >
            <svg className="w-6 h-6 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-stone-100 bg-white px-4 py-3 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`block px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                pathname === link.href
                  ? "text-orange-500 bg-orange-50"
                  : "text-stone-600 hover:bg-orange-50"
              }`}
            >
              {link.label}
            </Link>
          ))}
          {!user && (
            <>
              <Link href="/login" onClick={() => setMenuOpen(false)} className="block px-4 py-3 rounded-xl text-sm text-stone-600 hover:bg-orange-50">
                {t("login", "auth")}
              </Link>
              <Link href="/register" onClick={() => setMenuOpen(false)} className="block px-4 py-3 rounded-xl text-sm text-white bg-orange-500 text-center">
                {t("register", "auth")}
              </Link>
            </>
          )}
          <button
            onClick={() => { toggle(); setMenuOpen(false); }}
            className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-stone-600 hover:bg-orange-50 w-full"
          >
            <span>{lang === "th" ? "🇬🇧" : "🇹🇭"}</span>
            {lang === "th" ? "Switch to English" : "เปลี่ยนเป็นภาษาไทย"}
          </button>
        </div>
      )}
    </nav>
  );
}
