import type { Metadata } from "next";
import { Noto_Sans, Noto_Serif } from "next/font/google";
import { product } from "@/config/product";
import "./globals.css";

/**
 * The two faces named in the Fuller Seminary style guide.
 *
 * `next/font` downloads them at build time and serves them from our own origin, so
 * no request ever goes to Google at runtime — which matters for a page that displays
 * student-shaped records, and keeps the "no request leaves the origin" claim in the
 * privacy notes true.
 *
 * `display: "swap"` shows fallback text immediately rather than blocking paint; the
 * fallback stacks in globals.css are metric-similar enough that the swap is not
 * jarring.
 */
const notoSerif = Noto_Serif({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
});

const notoSans = Noto_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: `${product.name} — ${product.institution.name} prototype`,
    template: `%s · ${product.shortName}`,
  },
  description: product.description,
  // A prototype holding demonstration student records should not be indexed.
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${notoSerif.variable} ${notoSans.variable}`}>
      <body>
        <a
          href="#main"
          className="sr-only-focusable absolute left-4 top-4 z-50 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white no-underline"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
