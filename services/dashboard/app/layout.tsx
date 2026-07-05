import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  weight: ["400", "500", "600", "700"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://grid-demand.kardashevlabs.org";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "US Grid Demand Dashboard | Kardashev Labs",
  description:
    "Live US electricity demand across 15 balancing authorities, hourly data from the EIA Open Data API.",
  keywords: [
    "electricity demand", "grid load", "balancing authority", "EIA data",
    "CAISO", "ERCOT", "PJM", "MISO", "Kardashev Labs",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    title: "US Grid Demand Dashboard",
    description: "Live electricity demand across CAISO, ERCOT, PJM, MISO, and 11 more balancing authorities.",
    url: siteUrl,
    siteName: "Kardashev Labs",
  },
  twitter: {
    card: "summary",
    title: "US Grid Demand Dashboard",
    description: "Live electricity demand across CAISO, ERCOT, PJM, MISO, and 11 more balancing authorities.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Dataset",
      "@id": `${siteUrl}/#dataset`,
      name: "US Grid Demand Data",
      description:
        "Real-time and forecast US electricity demand across 15 balancing authorities, covering approximately 95% of the continental United States (CONUS). Sourced from the EIA Open Data API.",
      url: siteUrl,
      creator: {
        "@type": "Organization",
        name: "Kardashev Labs",
        url: "https://kardashevlabs.org",
      },
      keywords: [
        "electricity demand",
        "grid load",
        "balancing authority",
        "EIA data",
        "CAISO",
        "ERCOT",
        "PJM",
        "MISO",
      ],
      temporalCoverage: "..",
      license: "https://opensource.org/licenses/MIT",
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: "US Grid Demand Dashboard",
      description: "Live US electricity demand across 15 balancing authorities, hourly data from the EIA Open Data API.",
      publisher: {
        "@type": "Organization",
        name: "Kardashev Labs",
        url: "https://kardashevlabs.org",
      },
      inLanguage: "en-US",
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
