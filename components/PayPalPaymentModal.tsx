"use client";
import React, { useState } from "react";
import {
  PayPalScriptProvider,
  PayPalButtons,
  usePayPalScriptReducer,
} from "@paypal/react-paypal-js";

interface PayPalConfig {
  clientId: string;
  mode: "sandbox" | "live";
  amount: string;
  currency: string;
  description: string;
}

interface PayPalPaymentModalProps {
  open: boolean;
  config: PayPalConfig;
  onSuccess: (details: Record<string, unknown>) => void;
  onCancel: () => void;
  onError: (err: unknown) => void;
}

function PayPalButtonsInner({
  config,
  onSuccess,
  onCancel,
  onError,
}: Omit<PayPalPaymentModalProps, "open">) {
  const [{ isPending, isRejected }] = usePayPalScriptReducer();
  const [capturing, setCapturing] = useState(false);
  const [paypalError, setPaypalError] = useState<string | null>(null);

  if (isPending) {
    return (
      <div style={{ textAlign: "center", padding: "24px 0", color: "#555" }}>
        Loading PayPal…
      </div>
    );
  }

  if (isRejected) {
    return (
      <div style={{ textAlign: "center", padding: "16px 0", color: "#c00" }}>
        Failed to load PayPal. Please check the Client ID or try again.
      </div>
    );
  }

  if (capturing) {
    return (
      <div style={{ textAlign: "center", padding: "24px 0", color: "#555" }}>
        Processing payment, please wait…
      </div>
    );
  }

  if (paypalError) {
    return (
      <div style={{ textAlign: "center", padding: "16px 0" }}>
        <div style={{ color: "#c00", marginBottom: 12 }}>{paypalError}</div>
        <button
          onClick={() => setPaypalError(null)}
          style={{ cursor: "pointer", padding: "8px 20px", borderRadius: 4, border: "1px solid #ccc" }}
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    // No fundingSource restriction — shows PayPal button + Debit/Credit Card.
    // Running in the top-level window (not iframe) so both popup and card
    // redirect flows work without cross-frame restrictions.
    <PayPalButtons
      style={{ layout: "vertical", color: "blue", shape: "rect", label: "pay" }}
      createOrder={async (_data, actions) => {
        try {
          const orderId = await actions.order.create({
            intent: "CAPTURE",
            purchase_units: [
              {
                amount: {
                  currency_code: config.currency,
                  value: String(config.amount),
                },
                description: config.description,
              },
            ],
          });
          console.log("[PayPal] Order created successfully. Order ID:", orderId);
          return orderId;
        } catch (err) {
          console.error("[PayPal] createOrder failed:", err);
          throw err;
        }
      }}
      onApprove={async (_data, actions) => {
        setCapturing(true);
        try {
          const details = await actions.order!.capture();
          onSuccess(details as Record<string, unknown>);
        } catch (err) {
          console.error("PayPal capture failed:", err);
          setCapturing(false);
          onError(err);
        }
      }}
      onCancel={onCancel}
      onError={(err) => {
        setCapturing(false);
        const msg =
          err instanceof Error
            ? err.message
            : "Payment failed. Please try again or use a different payment method.";
        console.error("PayPal onError:", err);
        setPaypalError(msg);
      }}
    />
  );
}

export default function PayPalPaymentModal({
  open,
  config,
  onSuccess,
  onCancel,
  onError,
}: PayPalPaymentModalProps) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 999999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 10,
          padding: "32px 28px",
          width: "100%",
          maxWidth: 460,
          margin: "0 16px",
          position: "relative",
          boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
        }}
      >
        <button
          onClick={onCancel}
          aria-label="Close payment"
          style={{
            position: "absolute",
            top: 12,
            right: 16,
            fontSize: "1.4rem",
            lineHeight: 1,
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#666",
          }}
        >
          &times;
        </button>

        <h3 style={{ margin: "0 0 4px", fontSize: "1.1rem", fontWeight: 600 }}>
          Complete Payment
        </h3>
        <p style={{ margin: "0 0 20px", color: "#555", fontSize: "0.95rem" }}>
          {config.currency} {config.amount} — {config.description}
        </p>

        <PayPalScriptProvider
          options={{
            clientId: config.clientId,
            currency: config.currency,
            intent: "capture",
            components: "buttons",
            disableFunding: "venmo,paylater",
          }}
        >
          <PayPalButtonsInner
            config={config}
            onSuccess={onSuccess}
            onCancel={onCancel}
            onError={onError}
          />
        </PayPalScriptProvider>
      </div>
    </div>
  );
}
