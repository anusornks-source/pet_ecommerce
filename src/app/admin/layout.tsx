import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AdminSidebar from "./AdminSidebar";
import { ShopAdminProvider } from "@/context/ShopAdminContext";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  // Allow ADMIN or any user with shop memberships
  if (!session) redirect("/");
  const hasShopAccess =
    session.role === "ADMIN" ||
    (session.shopRoles && Object.keys(session.shopRoles).length > 0);
  if (!hasShopAccess) redirect("/");

  return (
    <ShopAdminProvider session={session}>
      <div className="flex min-h-screen bg-stone-50">
        <AdminSidebar />
        <main className="flex-1 min-w-0 p-6">{children}</main>
      </div>
    </ShopAdminProvider>
  );
}
