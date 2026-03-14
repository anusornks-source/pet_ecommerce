import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AdminLayoutClient from "./AdminLayoutClient";
import { ShopAdminProvider } from "@/context/ShopAdminContext";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/");

  // Check DB directly — avoids stale JWT shopRoles issue
  const isAdmin = session.role === "ADMIN";
  let hasShopAccess = isAdmin;
  if (!isAdmin) {
    const count = await prisma.shopMember.count({ where: { userId: session.userId } });
    hasShopAccess = count > 0;
  }
  if (!hasShopAccess) redirect("/");

  return (
    <ShopAdminProvider session={session}>
      <AdminLayoutClient>{children}</AdminLayoutClient>
    </ShopAdminProvider>
  );
}
