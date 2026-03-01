const CJ_BASE = "https://developers.cjdropshipping.com/api2.0/v1";

async function getCJToken(): Promise<string> {
  const email = process.env.CJ_EMAIL;
  const password = process.env.CJ_PASSWORD;

  if (!email || !password) {
    throw new Error("CJ_EMAIL and CJ_PASSWORD are not configured in .env");
  }

  const res = await fetch(`${CJ_BASE}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (!data.result || !data.data?.accessToken) {
    throw new Error(`CJ Auth failed: ${data.message || JSON.stringify(data)}`);
  }

  return data.data.accessToken as string;
}

interface CJProduct {
  vid: string;
  quantity: number;
}

interface CJOrderInput {
  orderNumber: string;
  shippingCustomerName: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingProvince: string;
  shippingCountry: string;
  shippingCountryCode: string;
  shippingZip: string;
  logisticName: string;
  products: CJProduct[];
  remark?: string;
}

export async function createCJOrder(input: CJOrderInput): Promise<{ cjOrderId: string }> {
  const token = await getCJToken();
  const logisticName = process.env.CJ_LOGISTIC_NAME || "CJPACKET";

  const body = {
    orderNumber: input.orderNumber,
    shippingCountry: input.shippingCountry || "Thailand",
    shippingCountryCode: input.shippingCountryCode || "TH",
    shippingProvince: input.shippingProvince || "",
    shippingCity: input.shippingCity || "",
    shippingAddress: input.shippingAddress,
    shippingCustomerName: input.shippingCustomerName,
    shippingPhone: input.shippingPhone,
    shippingZip: input.shippingZip || "",
    logisticName: input.logisticName || logisticName,
    products: input.products,
    remark: input.remark || "",
    fromCountryCode: "CN",
    payType: 2, // use CJ balance
  };

  const res = await fetch(`${CJ_BASE}/shopping/order/createOrderV2`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "CJ-Access-Token": token,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!data.result || !data.data?.orderId) {
    throw new Error(`CJ createOrder failed: ${data.message || JSON.stringify(data)}`);
  }

  return { cjOrderId: data.data.orderId as string };
}

export async function getCJOrderStatus(cjOrderId: string): Promise<string | null> {
  try {
    const token = await getCJToken();

    const res = await fetch(`${CJ_BASE}/shopping/order/getOrderDetail?orderId=${cjOrderId}`, {
      headers: { "CJ-Access-Token": token },
    });

    const data = await res.json();
    return data.data?.orderStatus ?? null;
  } catch {
    return null;
  }
}
