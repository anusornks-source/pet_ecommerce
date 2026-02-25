import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";

export const metadata: Metadata = {
  title: "PetShop - ร้านสัตว์เลี้ยงออนไลน์",
  description: "ช้อปสัตว์เลี้ยง อาหาร และของเล่น คุณภาพสูง ราคาถูก จัดส่งทั่วประเทศ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className="antialiased">
        <AuthProvider>
          <CartProvider>
            <Navbar />
            <main className="min-h-screen">{children}</main>
            <Footer />
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
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
