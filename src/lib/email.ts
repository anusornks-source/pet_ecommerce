import nodemailer from "nodemailer";

function createTransporter() {
  const host = process.env.EMAIL_HOST;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port: parseInt(process.env.EMAIL_PORT ?? "587"),
    secure: process.env.EMAIL_PORT === "465",
    auth: { user, pass },
  });
}

interface OrderEmailData {
  orderId: string;
  customerName: string;
  customerEmail: string;
  phone: string;
  address: string;
  note?: string | null;
  paymentMethod: string;
  total: number;
  items: { name: string; quantity: number; price: number }[];
  storeName: string;
  adminEmail: string;
}

const PAYMENT_LABEL: Record<string, string> = {
  CREDIT_CARD: "บัตรเครดิต",
  BANK_TRANSFER: "โอนเงิน",
  PROMPTPAY: "พร้อมเพย์",
  COD: "เก็บเงินปลายทาง",
};

function formatPrice(n: number) {
  return n.toLocaleString("th-TH", { style: "currency", currency: "THB" });
}

export async function sendOrderNotification(data: OrderEmailData) {
  const transporter = createTransporter();
  if (!transporter) return; // Email not configured — skip silently

  const itemsHtml = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f5f5f4">${item.name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f5f5f4;text-align:center">${item.quantity}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f5f5f4;text-align:right">${formatPrice(item.price)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f5f5f4;text-align:right">${formatPrice(item.price * item.quantity)}</td>
      </tr>`
    )
    .join("");

  const html = `
<!DOCTYPE html>
<html lang="th">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:sans-serif;background:#f5f5f4;color:#1c1917">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08)">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#f97316,#f59e0b);padding:24px 32px">
      <h1 style="margin:0;color:#fff;font-size:20px">🛒 คำสั่งซื้อใหม่!</h1>
      <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:14px">${data.storeName}</p>
    </div>

    <!-- Order ID -->
    <div style="padding:20px 32px;background:#fff7ed;border-bottom:1px solid #fed7aa">
      <p style="margin:0;font-size:13px;color:#9a3412">หมายเลขคำสั่งซื้อ</p>
      <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#ea580c;font-family:monospace">#${data.orderId.slice(-8).toUpperCase()}</p>
    </div>

    <div style="padding:24px 32px">
      <!-- Customer info -->
      <h2 style="margin:0 0 12px;font-size:15px;color:#78716c;text-transform:uppercase;letter-spacing:.5px">ข้อมูลลูกค้า</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
        <tr><td style="padding:4px 0;font-size:14px;color:#78716c;width:120px">ชื่อ</td><td style="padding:4px 0;font-size:14px;font-weight:600">${data.customerName}</td></tr>
        <tr><td style="padding:4px 0;font-size:14px;color:#78716c">อีเมล</td><td style="padding:4px 0;font-size:14px">${data.customerEmail}</td></tr>
        <tr><td style="padding:4px 0;font-size:14px;color:#78716c">เบอร์โทร</td><td style="padding:4px 0;font-size:14px">${data.phone}</td></tr>
        <tr><td style="padding:4px 0;font-size:14px;color:#78716c">ที่อยู่</td><td style="padding:4px 0;font-size:14px">${data.address}</td></tr>
        <tr><td style="padding:4px 0;font-size:14px;color:#78716c">การชำระเงิน</td><td style="padding:4px 0;font-size:14px">${PAYMENT_LABEL[data.paymentMethod] ?? data.paymentMethod}</td></tr>
        ${data.note ? `<tr><td style="padding:4px 0;font-size:14px;color:#78716c">หมายเหตุ</td><td style="padding:4px 0;font-size:14px">${data.note}</td></tr>` : ""}
      </table>

      <!-- Items -->
      <h2 style="margin:0 0 12px;font-size:15px;color:#78716c;text-transform:uppercase;letter-spacing:.5px">รายการสินค้า</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
        <thead>
          <tr style="background:#f5f5f4">
            <th style="padding:8px 12px;text-align:left;font-size:13px;color:#78716c">สินค้า</th>
            <th style="padding:8px 12px;text-align:center;font-size:13px;color:#78716c">จำนวน</th>
            <th style="padding:8px 12px;text-align:right;font-size:13px;color:#78716c">ราคา/ชิ้น</th>
            <th style="padding:8px 12px;text-align:right;font-size:13px;color:#78716c">รวม</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>

      <!-- Total -->
      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:16px;text-align:right">
        <span style="font-size:14px;color:#78716c">ยอดรวมทั้งสิ้น</span>
        <span style="font-size:22px;font-weight:700;color:#ea580c;margin-left:12px">${formatPrice(data.total)}</span>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding:16px 32px;background:#f5f5f4;text-align:center">
      <p style="margin:0;font-size:12px;color:#a8a29e">อีเมลนี้ส่งโดยอัตโนมัติจากระบบ ${data.storeName}</p>
    </div>
  </div>
</body>
</html>`;

  const from = process.env.EMAIL_FROM ?? process.env.EMAIL_USER;

  await transporter.sendMail({
    from,
    to: data.adminEmail,
    subject: `[${data.storeName}] คำสั่งซื้อใหม่ #${data.orderId.slice(-8).toUpperCase()} — ${formatPrice(data.total)}`,
    html,
  });
}
