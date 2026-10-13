import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import { PostHogIdentify } from "@/app/login/dev-inbox";
import { getCurrentUser } from "@/lib/auth";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "startupfans: the inside track on startups",
  description:
    "One public feed for everything a startup's team is shipping, posted by the people building it. Free to follow.",
  openGraph: {
    title: "startupfans",
    description: "Get the inside track on startups.",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <html lang="en" className={`${bricolage.variable} ${geist.variable} ${geistMono.variable}`}>
      <body className="font-sans antialiased">
        <PostHogIdentify user={user ? { id: user.id, email: user.email, name: user.name } : null} />
        {children}
      </body>
    </html>
  );
}
