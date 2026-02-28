"use client";

import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { formatPrice } from "@/lib/utils";

// ---- Inner form (inside Elements provider) ----
function CardForm({
  clientSecret,
  total,
  onSuccess,
}: {
  clientSecret: string;
  total: number;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setPaying(true);
    setError(null);

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (stripeError) {
      setError(stripeError.message ?? "การชำระเงินล้มเหลว");
      setPaying(false);
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handlePay} className="space-y-4">
      <PaymentElement />
      {error && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
      )}
      <button
        type="submit"
        disabled={!stripe || paying}
        className="w-full btn-primary py-3 flex items-center justify-center gap-2"
      >
        {paying ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            กำลังชำระเงิน...
          </>
        ) : (
          <>💳 ชำระเงิน {formatPrice(total)}</>
        )}
      </button>
    </form>
  );
}

// ---- Outer wrapper — loads Stripe + fetches clientSecret ----
export default function StripeCardForm({
  orderId,
  total,
  onSuccess,
}: {
  orderId: string;
  total: number;
  onSuccess: () => void;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripePromise] = useState(() => {
    const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    return pk ? loadStripe(pk) : null;
  });
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!stripePromise) {
      setLoadError("Stripe ยังไม่ได้ตั้งค่า (NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)");
      return;
    }
    fetch("/api/payments/stripe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setClientSecret(d.data.clientSecret);
        } else {
          setLoadError(d.error ?? "เกิดข้อผิดพลาด");
        }
      });
  }, [orderId, stripePromise]);

  if (loadError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">
        {loadError}
      </div>
    );
  }

  if (!clientSecret || !stripePromise) {
    return (
      <div className="flex items-center justify-center py-8 gap-2 text-stone-500 text-sm">
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        กำลังโหลดฟอร์มบัตร...
      </div>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{ clientSecret, locale: "th", appearance: { theme: "stripe" } }}
    >
      <CardForm clientSecret={clientSecret} total={total} onSuccess={onSuccess} />
    </Elements>
  );
}
