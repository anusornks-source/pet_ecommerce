import { NextRequest } from "next/server";
import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";
import { prisma } from "@/lib/prisma";
import { requireShopAdmin, isShopAuthResponse } from "@/lib/shopAuth";
import QRCode from "qrcode";

export const runtime = "nodejs";

const fontData = readFileSync(join(process.cwd(), "public/fonts/NotoSansThai-Bold.ttf"));

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
    const qrDataUrl = await QRCode.toDataURL(`${appUrl}/products/${id}`, { width: 200, margin: 1 });

    const primaryColor =
      (product.shop?.settings as { primaryColor?: string } | null)?.primaryColor ??
      "#f97316";

    const name = (product.name_th ?? product.name).slice(0, 50);
    const shopName = product.shop?.name ?? "";
    const price = String(product.price);

    const imgUrl = product.images[0] ?? null;
    let productImgSrc: string | null = null;
    if (imgUrl) {
      try {
        const res = await fetch(imgUrl, { signal: AbortSignal.timeout(5000) });
        let mime = res.headers.get("content-type") ?? "image/jpeg";
        const buf = await res.arrayBuffer();
        if (mime === "image/jpg") mime = "image/jpeg";
        productImgSrc = `data:${mime};base64,${Buffer.from(buf).toString("base64")}`;
      } catch {
        // fallback: no product image
      }
    }

    return new ImageResponse(
      (
        <div style={{ width: 1080, height: 1080, display: "flex", flexDirection: "column", backgroundColor: "#e7e5e4", fontFamily: "NotoSansThai" }}>

          {/* Product image or placeholder */}
          {productImgSrc ? (
            <img src={productImgSrc} width={1080} height={648} />
          ) : (
            <div style={{ display: "flex", width: 1080, height: 648, alignItems: "center", justifyContent: "center", backgroundColor: "#d6d3d1" }}>
              <div style={{ display: "flex", fontSize: 80, color: "#a8a29e" }}>No Image</div>
            </div>
          )}

          {/* Bottom info bar */}
          <div style={{ display: "flex", width: 1080, height: 432, backgroundColor: primaryColor, flexDirection: "row", alignItems: "center", paddingLeft: 48, paddingRight: 48, paddingTop: 32, paddingBottom: 32 }}>
            <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, width: 700, paddingRight: 40 }}>
              <div style={{ display: "flex", fontSize: 42, fontWeight: 700, color: "white", marginBottom: 16 }}>{name}</div>
              <div style={{ display: "flex", fontSize: 60, fontWeight: 800, color: "white", marginBottom: 12 }}>{price} THB</div>
              {shopName ? <div style={{ display: "flex", fontSize: 28, color: "#fef3c7" }}>{shopName}</div> : null}
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 240 }}>
              <div style={{ display: "flex", width: 200, height: 200, backgroundColor: "white", borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                <img src={qrDataUrl} width={180} height={180} />
              </div>
              <div style={{ display: "flex", fontSize: 20, color: "#fef3c7" }}>Scan to view</div>
            </div>
          </div>

        </div>
      ),
      {
        width: 1080,
        height: 1080,
        fonts: [
          { name: "NotoSansThai", data: fontData, weight: 700 as const, style: "normal" as const },
        ],
      }
    );
  } catch (err) {
    console.error("[share-card]", err);
    return new Response(`Error: ${String(err)}`, { status: 500 });
  }
}
