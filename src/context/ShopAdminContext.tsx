"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import type { CustomJWTPayload } from "@/lib/auth";

interface Shop {
  id: string;
  name: string;
  name_th: string | null;
  slug: string;
  logoUrl: string | null;
  usePetType: boolean;
  active: boolean;
}

interface ShopAdminContextType {
  /** Currently selected shop */
  activeShop: Shop | null;
  /** All shops accessible to this user */
  shops: Shop[];
  /** Switch active shop */
  setActiveShopId: (shopId: string) => void;
  /** Current user's role in the active shop (null for ADMIN) */
  shopRole: string | null;
  /** Whether current user is platform ADMIN */
  isAdmin: boolean;
  /** Session payload */
  session: CustomJWTPayload;
  loading: boolean;
}

const ShopAdminContext = createContext<ShopAdminContextType | null>(null);

const COOKIE_NAME = "activeShopId";

function getCookieShopId(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookieShopId(shopId: string) {
  document.cookie = `${COOKIE_NAME}=${shopId}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

export function ShopAdminProvider({
  children,
  session,
}: {
  children: ReactNode;
  session: CustomJWTPayload;
}) {
  const [shops, setShops] = useState<Shop[]>([]);
  const [activeShop, setActiveShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const isAdmin = session.role === "ADMIN";

  useEffect(() => {
    // Refresh JWT first (fixes stale shopRoles after new shop assignment)
    fetch("/api/auth/refresh", { method: "POST" })
      .catch(() => {})
      .finally(() => {
        fetch("/api/admin/shops/my-shops")
          .then((r) => r.json())
          .then((data) => {
            if (data.success && data.data.length > 0) {
              setShops(data.data);
              const cookieId = getCookieShopId();
              const initial =
                data.data.find((s: Shop) => s.id === cookieId) || data.data[0];
              setActiveShop(initial);
              setCookieShopId(initial.id);
            }
            setLoading(false);
          })
          .catch(() => setLoading(false));
      });
  }, []);

  const setActiveShopId = useCallback(
    (shopId: string) => {
      const shop = shops.find((s) => s.id === shopId);
      if (shop) {
        setActiveShop(shop);
        setCookieShopId(shopId);
      }
    },
    [shops]
  );

  const shopRole = activeShop
    ? session.shopRoles?.[activeShop.id] ?? (isAdmin ? null : null)
    : null;

  return (
    <ShopAdminContext.Provider
      value={{
        activeShop,
        shops,
        setActiveShopId,
        shopRole,
        isAdmin,
        session,
        loading,
      }}
    >
      {children}
    </ShopAdminContext.Provider>
  );
}

export function useShopAdmin() {
  const ctx = useContext(ShopAdminContext);
  if (!ctx) throw new Error("useShopAdmin must be used within ShopAdminProvider");
  return ctx;
}
