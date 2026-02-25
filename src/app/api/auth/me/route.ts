import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, phone: true, address: true, avatar: true, role: true, createdAt: true },
  });

  if (!user) {
    return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: user });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, phone, address } = body;

  const user = await prisma.user.update({
    where: { id: session.userId },
    data: { name, phone, address },
    select: { id: true, email: true, name: true, phone: true, address: true, avatar: true, role: true, createdAt: true },
  });

  return NextResponse.json({ success: true, data: user });
}
