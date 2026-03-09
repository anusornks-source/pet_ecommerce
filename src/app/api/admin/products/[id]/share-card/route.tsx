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
      include: {
        shop: {
          include: { settings: true },
        },
      },
    });

    if (!product) {
      return new Response("Product not found", { status: 404 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://example.com";
    const productUrl = `${appUrl}/products/${id}`;

    const [qrDataUrl, productImageBase64] = await Promise.all([
      QRCode.toDataURL(productUrl, {
        width: 220,
        margin: 1,
        color: { dark: "#1c1917", light: "#ffffff" },
      }),
      product.images[0] ? fetchImageAsBase64(product.images[0]) : Promise.resolve(null),
    ]);

    const primaryColor =
      (product.shop?.settings as { primaryColor?: string } | null)?.primaryColor ??
      "#f97316";

    const name = (product.name_th ?? product.name).slice(0, 60);
    const shopName = product.shop?.name ?? "";
    const price = product.price.toLocaleString("th-TH", { minimumFractionDigits: 0 });

    return new ImageResponse(
      (
        <div
          style={{
            width: 1080,
            height: 1080,
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#f5f5f4",
          }}
        >
          {/* Product image — top 60% */}
          <div
            style={{
              width: 1080,
              height: 648,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              backgroundColor: "#e7e5e4",
            }}
          >
            {productImageBase64 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={productImageBase64}
                alt=""
                style={{ width: 1080, height: 648, objectFit: "cover" }}
              />
            ) : (
              <span style={{ fontSize: 120, color: "#d6d3d1" }}>🐾</span>
            )}
          </div>

          {/* Bottom section — 40% */}
          <div
            style={{
              width: 1080,
              height: 432,
              backgroundColor: primaryColor,
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              padding: "36px 48px",
              gap: 32,
            }}
          >
            {/* Text block */}
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 16,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  fontSize: 48,
                  fontWeight: 700,
                  color: "#ffffff",
                  lineHeight: 1.25,
                  maxHeight: 120,
                  overflow: "hidden",
                }}
              >
                {name}
              </div>
              <div
                style={{
                  fontSize: 64,
                  fontWeight: 800,
                  color: "#ffffff",
                  lineHeight: 1,
                }}
              >
                ฿{price}
              </div>
              {shopName ? (
                <div
                  style={{
                    fontSize: 30,
                    color: "rgba(255,255,255,0.8)",
                  }}
                >
                  {shopName}
                </div>
              ) : null}
            </div>

            {/* QR code */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
                flexShrink: 0,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt="QR"
                style={{
                  width: 220,
                  height: 220,
                  borderRadius: 12,
                  backgroundColor: "#ffffff",
                  padding: 8,
                }}
              />
              <span style={{ fontSize: 24, color: "rgba(255,255,255,0.8)" }}>
                สแกนดูสินค้า
              </span>
            </div>
          </div>
        </div>
      ),
      {
        width: 1080,
        height: 1080,
      }
    );
  } catch (err) {
    console.error("[share-card] error:", err);
    return new Response(`Error generating share card: ${String(err)}`, { status: 500 });
  }
}
