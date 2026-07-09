import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AmbientBackground } from "@/components/ambient-background";
import { SideNav } from "@/components/side-nav";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Design Studio",
  description: "A schema-driven dashboard over the design-studio vault.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
    >
      <body className="min-h-screen md:h-screen md:overflow-hidden">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AmbientBackground />
          <div className="flex min-h-screen flex-col md:h-screen md:min-h-0 md:flex-row">
            <SideNav />
            <main className="min-w-0 flex-1 md:flex md:flex-col md:overflow-hidden">
              {children}
            </main>
          </div>
          <Toaster position="bottom-left" />
        </ThemeProvider>
      </body>
    </html>
  );
}
