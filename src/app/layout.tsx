import type { Metadata } from "next";
import { product } from "@/config/product";
import "./globals.css";

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
    <html lang="en">
      <body>
        <a
          href="#main"
          className="sr-only-focusable absolute left-4 top-4 z-50 rounded-md bg-burgundy-600 px-4 py-2 text-sm font-medium text-cream-50 no-underline"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
