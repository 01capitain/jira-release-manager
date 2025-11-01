import "sonner/dist/styles.css";
import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { AppShell } from "~/components/layout/app-shell";
import { ReactQueryProvider } from "~/components/providers/react-query-provider";
import { ThemeProvider } from "~/components/theme/theme-provider";

export const metadata: Metadata = {
  title: "Jira Release Manager",
  description: "Manage Sorftware Releases with Jira",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={geist.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-neutral-900 text-neutral-900 antialiased dark:bg-neutral-950 dark:text-neutral-100">
        <ReactQueryProvider>
          <ThemeProvider>
            <AppShell>{children}</AppShell>
          </ThemeProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
