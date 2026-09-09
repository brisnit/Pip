import type { Metadata } from "next";
import localFont from "next/font/local";
import { product } from "@/config/product";
import "./globals.css";

/**
 * Satoshi, the one typeface in the system.
 *
 * Self-hosted from `public/fonts` rather than pulled from Fontshare's CDN at
 * runtime: no request leaves our origin, which keeps the claim in the privacy notes
 * true and means the type cannot fail to load because a third party is down or
 * blocked. Satoshi is free for commercial use under the Indian Type Foundry's font
 * licence; the files here are the standard webfont build.
 *
 * Four weights, not five. The design direction leans on 400 and 500 and explicitly
 * avoids heavy type, so 300 covers large display text, 700 is there for the rare
 * moment that needs it, and semibold is not worth another request.
 *
 * `display: "swap"` paints fallback text immediately instead of blocking; the
 * fallback stack in globals.css is metric-similar enough that the swap is quiet.
 */
const satoshi = localFont({
  src: [
    {
      path: "../../public/fonts/Satoshi-300.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../public/fonts/Satoshi-400.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/Satoshi-500.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/Satoshi-700.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  display: "swap",
  variable: "--font-satoshi",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "Helvetica", "Arial"],
});

export const metadata: Metadata = {
  title: {
    default: `${product.name} — ${product.institution.name}`,
    template: `%s · ${product.shortName}`,
  },
  description: product.description,
  // Not for public indexing while this is being reviewed internally.
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={satoshi.variable}>
      <body>
        <a
          href="#main"
          className="sr-only-focusable absolute left-4 top-4 z-50 rounded-full bg-ink-900 px-5 py-2.5 text-sm font-medium text-white no-underline"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
