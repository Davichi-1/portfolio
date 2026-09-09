import type { Metadata, Viewport } from "next";
import { Anybody, Archivo, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { profile, siteMeta } from "@/lib/profile";
import Atmosphere from "@/components/Atmosphere";
import Reticle from "@/components/Reticle";

/**
 * Display face. Anybody carries a variable width axis, which the hero uses as
 * an expressive device — type stretching the way a signal stretches.
 */
const anybody = Anybody({
  subsets: ["latin"],
  variable: "--font-anybody",
  axes: ["wdth"],
  display: "swap",
});

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#0b1114",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteMeta.url),
  title: {
    default: siteMeta.title,
    template: `%s — ${profile.fullName}`,
  },
  description: siteMeta.description,
  keywords: [...siteMeta.keywords],
  authors: [{ name: profile.fullName, url: siteMeta.url }],
  creator: profile.fullName,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_NG",
    url: siteMeta.url,
    siteName: profile.fullName,
    title: siteMeta.title,
    description: siteMeta.description,
  },
  twitter: {
    card: "summary_large_image",
    title: siteMeta.title,
    description: siteMeta.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

/** Schema.org Person, so search results attribute the work correctly. */
const structuredData = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: profile.fullName,
  givenName: profile.firstName,
  familyName: profile.lastName,
  jobTitle: profile.role,
  email: `mailto:${profile.email}`,
  telephone: profile.phoneInternational,
  url: siteMeta.url,
  description: siteMeta.description,
  address: { "@type": "PostalAddress", addressCountry: "NG" },
  knowsAbout: [
    "Graphic design",
    "Software engineering",
    "Sound engineering",
    "Cinematography",
    "Mobile photography",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // The font variables must live on <html>, not <body>. Tailwind declares
    // --font-display / --font-body on :root, and those reference the next/font
    // variables. Custom properties are substituted at the element where they're
    // declared, so if --font-anybody only existed on <body>, the :root
    // declaration would resolve to invalid and inherit down as empty.
    <html
      lang="en"
      className={`${anybody.variable} ${archivo.variable} ${jetbrains.variable} scroll-smooth`}
    >
      <body className="cursor-host antialiased">
        <a
          href="#work"
          className="mono-label sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[200] focus:bg-amber focus:px-4 focus:py-2 focus:text-ink"
        >
          Skip to work
        </a>

        {children}

        <Atmosphere />
        <Reticle />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </body>
    </html>
  );
}
