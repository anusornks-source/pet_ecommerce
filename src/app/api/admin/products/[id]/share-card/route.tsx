import { NextRequest } from "next/server";
import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import { requireShopAdmin, isShopAuthResponse } from "@/lib/shopAuth";
import QRCode from "qrcode";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const qrDataUrl = await QRCode.toDataURL(productUrl, {
    width: 220,
    margin: 1,
    color: { dark: "#1c1917", light: "#ffffff" },
  });

  const primaryColor =
    (product.shop?.settings as { primaryColor?: string } | null)?.primaryColor ??
    "#f97316";

  const imageUrl = product.images[0] ?? "";
  const name = (product.name_th ?? product.name).slice(0, 80);
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
          backgroundColor: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        {/* Product image — top 60% */}
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            style={{
              width: 1080,
              height: 648,
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              width: 1080,
              height: 648,
              backgroundColor: "#f5f5f4",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: 80, color: "#d6d3d1" }}>🐾</span>
          </div>
        )}

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
              gap: 12,
            }}
          >
            <div
              style={{
                fontSize: 52,
                fontWeight: 700,
                color: "#ffffff",
                lineHeight: 1.2,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {name}
            </div>
            <div
              style={{
                fontSize: 60,
                fontWeight: 800,
                color: "#ffffff",
              }}
            >
              ฿{price}
            </div>
            {shopName && (
              <div
                style={{
                  fontSize: 32,
                  color: "rgba(255,255,255,0.8)",
                }}
              >
                {shopName}
              </div>
            )}
          </div>

          {/* QR code */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
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
}
