import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const petTypes = await prisma.petType.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json({ success: true, data: petTypes });
}
