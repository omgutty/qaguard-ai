import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { WorkflowProvider } from "@/lib/state/workflow-provider";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "QAGuard AI — AI-Powered Test Intelligence & Governance",
  description:
    "Transform requirements into reliable, traceable, audit-ready test artifacts. Nothing ships to automation without human approval.",
};

const themeInitScript = `(function(){try{var t=localStorage.getItem('qaguard-theme');var d=(t==='light'||t==='dark')?t:'dark';document.documentElement.setAttribute('data-theme',d);}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full">
        <ThemeProvider>
          <WorkflowProvider>{children}</WorkflowProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
