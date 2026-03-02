import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { getCJToken, searchCJProducts } from "@/lib/cjDropshipping";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const thaiAddressPath = path.join(process.cwd(), "public", "data", "thai-address.json");
  return NextResponse.json({
    success: true,
    data: {
      database: !!process.env.DATABASE_URL,
      cj: !!process.env.CJ_API_KEY,
      email: !!(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS),
      facebook: !!(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET),
      line: !!(process.env.LINE_CHANNEL_ID && process.env.LINE_CHANNEL_SECRET),
      stripe: !!process.env.STRIPE_SECRET_KEY,
      thaiAddress: fs.existsSync(thaiAddressPath),
    },
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { test, payload } = await request.json();
  const startTime = Date.now();

  try {
    switch (test) {
      case "database": {
        const [productCount, orderCount, userCount] = await Promise.all([
          prisma.product.count(),
          prisma.order.count(),
          prisma.user.count(),
        ]);
        return NextResponse.json({
          success: true,
          message: `เชื่อมต่อสำเร็จ — สินค้า ${productCount} รายการ, ออเดอร์ ${orderCount} รายการ, ผู้ใช้ ${userCount} คน`,
          ms: Date.now() - startTime,
        });
      }

      case "cj-auth": {
        if (!process.env.CJ_API_KEY) {
          return NextResponse.json({ success: false, error: "CJ_API_KEY ยังไม่ได้ตั้งค่าใน .env" });
        }
        const token = await getCJToken();
        return NextResponse.json({
          success: true,
          message: `ได้รับ Token แล้ว (${token.length} chars) — ${token.slice(0, 16)}...`,
          ms: Date.now() - startTime,
        });
      }

      case "cj-search": {
        if (!process.env.CJ_API_KEY) {
          return NextResponse.json({ success: false, error: "CJ_API_KEY ยังไม่ได้ตั้งค่าใน .env" });
        }
        const result = await searchCJProducts("pet food", 1);
        return NextResponse.json({
          success: true,
          message: `ค้นหาสำเร็จ — พบ ${result.total} สินค้า`,
          ms: Date.now() - startTime,
        });
      }

      case "email-verify": {
        const host = process.env.EMAIL_HOST;
        const user = process.env.EMAIL_USER;
        const pass = process.env.EMAIL_PASS;

        if (!host || !user || !pass) {
          return NextResponse.json({ success: false, error: "EMAIL_HOST, EMAIL_USER, EMAIL_PASS ยังไม่ครบ" });
        }
        const transporter = nodemailer.createTransport({
          host,
          port: parseInt(process.env.EMAIL_PORT ?? "587"),
          secure: process.env.EMAIL_PORT === "465",
          auth: { user, pass },
        });
        await transporter.verify();
        return NextResponse.json({
          success: true,
          message: `SMTP เชื่อมต่อสำเร็จ — ${host}:${process.env.EMAIL_PORT ?? "587"}`,
          ms: Date.now() - startTime,
        });
      }

      case "email-send": {
        const host = process.env.EMAIL_HOST;
        const user = process.env.EMAIL_USER;
        const pass = process.env.EMAIL_PASS;
        const to = payload?.to || process.env.EMAIL_USER;

        if (!host || !user || !pass) {
          return NextResponse.json({ success: false, error: "Email ยังไม่ได้ตั้งค่า" });
        }
        if (!to) {
          return NextResponse.json({ success: false, error: "กรุณาระบุ email ปลายทาง" });
        }
        const transporter = nodemailer.createTransport({
          host,
          port: parseInt(process.env.EMAIL_PORT ?? "587"),
          secure: process.env.EMAIL_PORT === "465",
          auth: { user, pass },
        });
        await transporter.sendMail({
          from: process.env.EMAIL_FROM ?? user,
          to,
          subject: "🔧 Test Email — System Integration",
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:32px auto;padding:24px;border:1px solid #e7e5e4;border-radius:12px">
              <h2 style="margin:0 0 12px;color:#1c1917">🔧 Test Email</h2>
              <p style="color:#57534e;margin:0 0 8px">อีเมลนี้ส่งจาก <strong>Admin System Integration</strong></p>
              <p style="color:#57534e;margin:0">หากได้รับอีเมลนี้ แสดงว่าระบบ SMTP ทำงานถูกต้องแล้ว ✅</p>
            </div>`,
        });
        return NextResponse.json({
          success: true,
          message: `ส่ง test email ไปที่ ${to} แล้ว`,
          ms: Date.now() - startTime,
        });
      }

      case "stripe": {
        if (!process.env.STRIPE_SECRET_KEY) {
          return NextResponse.json({ success: false, error: "STRIPE_SECRET_KEY ยังไม่ได้ตั้งค่าใน .env" });
        }
        const { default: Stripe } = await import("stripe");
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        const balance = await stripe.balance.retrieve();
        const thb = balance.available.find((b) => b.currency === "thb");
        const usd = balance.available.find((b) => b.currency === "usd");
        const balanceStr = thb
          ? `${(thb.amount / 100).toFixed(2)} THB`
          : usd
          ? `${(usd.amount / 100).toFixed(2)} USD`
          : "OK";
        return NextResponse.json({
          success: true,
          message: `Stripe เชื่อมต่อสำเร็จ — Balance: ${balanceStr}`,
          ms: Date.now() - startTime,
        });
      }

      case "thai-address": {
        const filePath = path.join(process.cwd(), "public", "data", "thai-address.json");
        if (!fs.existsSync(filePath)) {
          return NextResponse.json({ success: false, error: "ไม่พบไฟล์ thai-address.json ใน public/data/" });
        }
        const raw = fs.readFileSync(filePath, "utf-8");
        const data = JSON.parse(raw) as Array<{ district: string; amphoe: string; province: string; zipcode: string }>;
        const count = data.length;
        const sample = data.slice(0, 5);

        let blobUrl: string | undefined;
        if (process.env.BLOB_READ_WRITE_TOKEN) {
          const { put } = await import("@vercel/blob");
          const blob = await put("thai-address.json", raw, {
            access: "public",
            contentType: "application/json",
            addRandomSuffix: false,
          });
          blobUrl = blob.url;
        }

        await prisma.siteSettings.upsert({
          where: { id: "default" },
          create: { id: "default", thaiAddressUpdatedAt: new Date(), ...(blobUrl ? { thaiAddressBlobUrl: blobUrl } : {}) },
          update: { thaiAddressUpdatedAt: new Date(), ...(blobUrl ? { thaiAddressBlobUrl: blobUrl } : {}) },
        });

        return NextResponse.json({
          success: true,
          message: blobUrl
            ? `อัปโหลดขึ้น Blob สำเร็จ — ${count.toLocaleString("th-TH")} รายการ`
            : `โหลดข้อมูลที่อยู่ไทยสำเร็จ — ${count.toLocaleString("th-TH")} รายการ (ไม่มี Blob token)`,
          count,
          sample,
          blobUrl,
          ms: Date.now() - startTime,
        });
      }

      default:
        return NextResponse.json({ success: false, error: "Unknown test" }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
      ms: Date.now() - startTime,
    });
  }
}
