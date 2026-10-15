import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Olavarria 3D — ideas que toman forma",
    template: "%s · Olavarria 3D",
  },
  description:
    "Impresión 3D personalizada. Explorá el catálogo de Olavarria 3D y consultanos por tu proyecto.",
  openGraph: {
    title: "Olavarria 3D — ideas que toman forma",
    description: "Piezas e ideas en impresión 3D. Conocé el catálogo y contactanos.",
    locale: "es_AR",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#102a46",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-AR">
      <body>{children}</body>
    </html>
  );
}
