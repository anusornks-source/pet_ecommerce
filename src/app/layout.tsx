import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { LocaleProvider } from "@/context/LocaleContext";
import ChatAssistant from "@/components/ChatAssistant";
import { getSettings } from "@/lib/settings";
import { cookies, headers } from "next/headers";
import type { Lang } from "@/lib/translations";
import { prisma } from "@/lib/prisma";

const KNOWN_ROUTES = new Set([
  "admin", "api", "products", "cart", "checkout", "orders", "profile",
  "login", "register", "articles", "stores", "advisor", "search", "wishlist",
]);

async function resolveNavBrand(pathname: string) {
  const segment = pathname.split("/").filter(Boolean)[0];
  if (!segment || KNOWN_ROUTES.has(segment)) return null;
  return prisma.shop.findUnique({
    where: { slug: segment, active: true },
    select: {
      id: true, name: true, name_th: true, logoUrl: true, slug: true,
      settings: {
        select: {
          phone: true, lineId: true, facebookUrl: true, instagramUrl: true, tiktokUrl: true,
          primaryColor: true,
        },
      },
    },
  });
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "CartNova - Multi-shop Cart Platform",
    description: "CartNova is a multi-shop ecommerce hub where customers can discover shops and products in one central cart.",
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSettings();
  const cookieStore = await cookies();
  const langCookie = cookieStore.get("lang")?.value;
  const initialLang: Lang = langCookie === "en" ? "en" : "th";

  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  const shopBrand = await resolveNavBrand(pathname);
  const navName = shopBrand?.name ?? "CartNova";
  // For CartNova hub ("/") อย่าใช้โลโก้จาก SiteSettings เพื่อไม่ให้ไปติดโลโก้ร้านเก่า
  const isHome = pathname === "/" || pathname === "";
  const navLogo = shopBrand?.logoUrl ?? (isHome ? undefined : settings.logoUrl ?? undefined);
  const shopId = shopBrand?.id ?? undefined;
  const shopSlug = shopBrand?.slug ?? undefined;
  const shopName = shopBrand?.name ?? undefined;

  return (
    <html lang={initialLang}>
      <body className="antialiased">
        <LocaleProvider initialLang={initialLang}>
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
            <Navbar storeName={navName} logoUrl={navLogo} shopId={shopId} shopSlug={shopSlug} />
            <main className="min-h-screen">{children}</main>
            <Footer
              storeName={navName}
              logoUrl={navLogo}
              phone={shopBrand?.settings?.phone ?? undefined}
              lineId={shopBrand?.settings?.lineId ?? undefined}
              facebookUrl={shopBrand?.settings?.facebookUrl ?? undefined}
              instagramUrl={shopBrand?.settings?.instagramUrl ?? undefined}
              tiktokUrl={shopBrand?.settings?.tiktokUrl ?? undefined}
              primaryColor={shopBrand?.settings?.primaryColor ?? undefined}
            />
            <ChatAssistant shopId={shopId} shopName={shopName} />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 3000,
                style: {
                  background: "#fff",
                  color: "#1c1917",
                  borderRadius: "12px",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
                  border: "1px solid #e7e5e4",
                },
                success: {
                  iconTheme: { primary: "#f97316", secondary: "#fff" },
                },
              }}
            />
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
