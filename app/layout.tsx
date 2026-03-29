import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Dwelling — NYC Apartment Reviews",
  description:
    "Find honest reviews and ratings for NYC apartment buildings. Search by address, neighborhood, or ZIP code.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-stone-50 text-stone-900 antialiased">
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-stone-200 bg-white py-8 mt-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center text-xs text-stone-400">
            <p>
              Building data sourced from{" "}
              <a
                href="https://www.nyc.gov/site/planning/data-maps/open-data/dwn-pluto-mappluto.page"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-stone-600"
              >
                NYC PLUTO
              </a>{" "}
              (NYC Department of City Planning). &copy; {new Date().getFullYear()} Dwelling.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
