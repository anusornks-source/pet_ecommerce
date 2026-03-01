export function formatPrice(price: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
  }).format(price);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

export const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING: "รอการยืนยัน",
  CONFIRMED: "ยืนยันแล้ว",
  SHIPPING: "กำลังจัดส่ง",
  DELIVERED: "ส่งสำเร็จ",
  CANCELLED: "ยกเลิก",
};

export const ORDER_STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  SHIPPING: "bg-purple-100 text-purple-800",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CREDIT_CARD: "บัตรเครดิต/เดบิต",
  BANK_TRANSFER: "โอนเงินธนาคาร",
  PROMPTPAY: "พร้อมเพย์",
  COD: "เก็บเงินปลายทาง",
  STRIPE: "Stripe (บัตรเครดิต)",
};


