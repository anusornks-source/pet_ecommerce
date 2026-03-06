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
    select: { id: true, name: true, name_th: true, logoUrl: true },
  });
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: `${settings.storeName} - ร้านสัตว์เลี้ยงออนไลน์`,
    description: "ช้อปสัตว์เลี้ยง อาหาร และของเล่น คุณภาพสูง ราคาถูก จัดส่งทั่วประเทศ",
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
  const navName = shopBrand?.name ?? settings.storeName;
  const navLogo = shopBrand?.logoUrl ?? settings.logoUrl ?? undefined;
  const shopId = shopBrand?.id ?? undefined;
  const shopName = shopBrand?.name ?? undefined;

  return (
    <html lang={initialLang}>
      <body className="antialiased">
        <LocaleProvider initialLang={initialLang}>
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
            <Navbar storeName={navName} logoUrl={navLogo} shopId={shopId} />
            <main className="min-h-screen">{children}</main>
            <Footer storeName={navName} logoUrl={navLogo} />
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
