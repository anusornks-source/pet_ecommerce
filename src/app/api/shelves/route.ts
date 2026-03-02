import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const shelves = await prisma.shelf.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
    include: {
      items: {
        orderBy: { order: "asc" },
        where: { product: { active: true } },
        include: {
          product: { include: { category: true, petType: true } },
        },
      },
    },
  });

  const filtered = shelves.filter((s) => s.items.length > 0);
  return NextResponse.json({ success: true, data: filtered });
}
