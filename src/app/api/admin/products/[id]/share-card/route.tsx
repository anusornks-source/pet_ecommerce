import { NextRequest } from "next/server";
import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import { requireShopAdmin, isShopAuthResponse } from "@/lib/shopAuth";
import QRCode from "qrcode";

export const runtime = "nodejs";

async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const mime = res.headers.get("content-type") ?? "image/jpeg";
    return `data:${mime};base64,${Buffer.from(buf).toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireShopAdmin(request);
    if (isShopAuthResponse(auth)) return auth;

    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: { shop: { include: { settings: true } } },
    });

    if (!product) {
      return new Response("Product not found", { status: 404 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://example.com";

    const [qrDataUrl, productImageBase64] = await Promise.all([
      QRCode.toDataURL(`${appUrl}/products/${id}`, {
        width: 200,
        margin: 1,
        color: { dark: "#1c1917", light: "#ffffff" },
      }),
      product.images[0] ? fetchImageAsBase64(product.images[0]) : Promise.resolve(null),
    ]);

    const primaryColor =
      (product.shop?.settings as { primaryColor?: string } | null)?.primaryColor ??
      "#f97316";

    const name = (product.name_th ?? product.name).slice(0, 50);
    const shopName = product.shop?.name ?? "";
    const price = product.price.toLocaleString("th-TH");

    return new ImageResponse(
      (
        <div style={{ width: 1080, height: 1080, display: "flex", flexDirection: "column", backgroundColor: "#e7e5e4" }}>

          {/* Top: product image 648px */}
          <div style={{ width: 1080, height: 648, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#e7e5e4" }}>
            {productImageBase64 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={productImageBase64} alt="" style={{ width: 1080, height: 648 }} />
            ) : (
              <div style={{ display: "flex", fontSize: 100, color: "#a8a29e" }}>🐾</div>
            )}
          </div>

          {/* Bottom: info 432px */}
          <div style={{ width: 1080, height: 432, backgroundColor: primaryColor, display: "flex", flexDirection: "row", alignItems: "center", paddingTop: 40, paddingBottom: 40, paddingLeft: 56, paddingRight: 56 }}>

            {/* Text */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingRight: 32 }}>
              <div style={{ fontSize: 44, fontWeight: 700, color: "#ffffff", lineHeight: 1.3, marginBottom: 14 }}>
                {name}
              </div>
              <div style={{ fontSize: 64, fontWeight: 800, color: "#ffffff", lineHeight: 1, marginBottom: 14 }}>
                ฿{price}
              </div>
              {shopName ? (
                <div style={{ fontSize: 28, color: "#fef3c7" }}>{shopName}</div>
              ) : null}
            </div>

            {/* QR wrapped in div */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ width: 220, height: 220, backgroundColor: "#ffffff", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt="QR" style={{ width: 200, height: 200 }} />
              </div>
              <div style={{ fontSize: 22, color: "#fef3c7" }}>สแกนดูสินค้า</div>
            </div>

          </div>
        </div>
      ),
      { width: 1080, height: 1080 }
    );
  } catch (err) {
    console.error("[share-card]", err);
    return new Response(`Error: ${String(err)}`, { status: 500 });
  }
}
