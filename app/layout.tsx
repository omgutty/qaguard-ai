import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { WorkflowProvider } from "@/lib/state/workflow-provider";

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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-zinc-950 text-zinc-100">
        <WorkflowProvider>{children}</WorkflowProvider>
      </body>
    </html>
  );
}
