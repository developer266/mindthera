"use client";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import PayPalPaymentModal from "./PayPalPaymentModal";

interface BookingWidgetModalProps {
  open: boolean;
  onClose: () => void;
  iframeUrl?: string;
  title?: string;
}

// const DEFAULT_IFRAME_URL =
//   "https://appointer-admin-panel.vercel.app/widget?provider=f6f2c8e6-d590-4038-94e4-e2f55e280866&locale=de&iframe=true";

const DEFAULT_IFRAME_URL =
  "http://localhost:5173/widget?provider=3be1c87d-0807-435b-a344-d812024e8d62&locale=de&iframe=true";

interface PayPalConfig {
  clientId: string;
  mode: "sandbox" | "live";
  amount: string;
  currency: string;
  description: string;
}

export default function BookingWidgetModal({
  open,
  onClose,
  iframeUrl,
  title,
}: BookingWidgetModalProps) {
  const baseUrl = iframeUrl || DEFAULT_IFRAME_URL;
  const resolvedUrl = title
    ? `${baseUrl}&packageName=${encodeURIComponent(title)}`
    : baseUrl;

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [paypalConfig, setPaypalConfig] = useState<PayPalConfig | null>(null);

  // Post a message back to the widget iframe
  const postToWidget = (data: Record<string, unknown>) => {
    iframeRef.current?.contentWindow?.postMessage(data, "*");
  };

  useEffect(() => {
    if (!open) return;

    const handleMessage = (event: MessageEvent) => {
      const { type, payload } = event.data || {};

      if (type === "APPOINTMENT_BOOKED") {
        onClose();
        toast.success("Appointment booked successfully!", {
          description: "You will receive a confirmation shortly.",
          duration: 5000,
        });
        return;
      }

      if (type === "APPOINTMENT_BOOKING_ERROR") {
        const errMsg = (event.data?.data?.error as string) || "Unknown error";
        toast.error(`Booking failed: ${errMsg}`, { duration: 8000 });
        return;
      }

      // Widget (inside iframe) is asking the parent to handle PayPal payment
      // because popups are blocked in cross-origin iframes.
      if (type === "PAYPAL_CHECKOUT_REQUIRED") {
        console.log("[BookingWidgetModal] PayPal config received:", payload);

        // DEV BYPASS: skip real PayPal and simulate a successful payment so the
        // full booking flow can be tested without sandbox credentials.
        // Remove this block (and the closing brace below) before going live.
        if (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_SKIP_PAYPAL === "true") {
          console.warn("[DEV] Skipping PayPal — simulating payment success");
          setTimeout(() => {
            postToWidget({
              type: "PAYPAL_PAYMENT_COMPLETE",
              payload: { id: "DEV-TEST-ORDER", status: "COMPLETED" },
            });
          }, 1000);
          return;
        }

        setPaypalConfig(payload as PayPalConfig);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Booking modal with the appointment widget iframe */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(0,0,0,0.7)",
          zIndex: 99999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: 8,
            maxWidth: "90vw",
            maxHeight: "90vh",
            overflow: "auto",
            position: "relative",
            boxShadow: "0 2px 16px rgba(0,0,0,0.2)",
          }}
        >
          <button
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              fontSize: "1.5rem",
              background: "none",
              border: "none",
              cursor: "pointer",
              zIndex: 2,
            }}
            aria-label="Schließen"
            onClick={onClose}
          >
            &times;
          </button>
          <iframe
            ref={iframeRef}
            src={resolvedUrl}
            style={{
              width: "90vw",
              maxWidth: "90vw",
              height: "80vh",
              border: "none",
              borderRadius: 8,
            }}
            allow="payment"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            allowFullScreen
          />
        </div>
      </div>

      {/* PayPal modal — rendered in the top-level window, not inside the iframe,
          so PayPal popups are never blocked */}
      {paypalConfig && (
        <PayPalPaymentModal
          open={true}
          config={paypalConfig}
          onSuccess={(details) => {
            toast.info("Payment captured — booking appointment…", { duration: 4000 });
            setPaypalConfig(null);
            postToWidget({ type: "PAYPAL_PAYMENT_COMPLETE", payload: details });
          }}
          onCancel={() => {
            toast.info("Payment cancelled.", { duration: 3000 });
            setPaypalConfig(null);
            postToWidget({ type: "PAYPAL_PAYMENT_CANCELLED" });
          }}
          onError={(err) => {
            console.error("PayPal error from parent modal:", err);
            const msg = err instanceof Error ? err.message : JSON.stringify(err);
            toast.error(`PayPal error: ${msg}`, { duration: 10000 });
            setPaypalConfig(null);
            postToWidget({ type: "PAYPAL_PAYMENT_ERROR" });
          }}
        />
      )}
    </>
  );
}
