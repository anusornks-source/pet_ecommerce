import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AdminSidebar from "./AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen bg-stone-50">
      <AdminSidebar />
      <main className="flex-1 min-w-0 p-6">{children}</main>
    </div>
  );
}
