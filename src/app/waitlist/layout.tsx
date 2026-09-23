import type { Metadata } from "next";
import type { ReactNode } from "react";

const title = "Flowmail — Open-source Shopify email automation";
const description =
  "The self-hostable Klaviyo alternative. Abandoned cart, welcome & win-back flows built Shopify-first. Flat cost, own your data.";

export const metadata: Metadata = {
  metadataBase: new URL("https://flowmail-six.vercel.app"),
  title,
  description,
  keywords: [
    "Shopify email marketing",
    "Klaviyo alternative",
    "open source email automation",
    "abandoned cart",
    "self-hosted",
    "ecommerce",
  ],
  alternates: { canonical: "/waitlist" },
  openGraph: {
    title,
    description,
    url: "/waitlist",
    siteName: "Flowmail",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function WaitlistLayout({ children }: { children: ReactNode }) {
  return children;
}
