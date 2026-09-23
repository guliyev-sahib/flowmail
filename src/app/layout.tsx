import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "Flowmail",
  description: "Open-source, Shopify-native email marketing & automation.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          margin: 0,
          background: "#f4f4f5",
          color: "#111827",
        }}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
