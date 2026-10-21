import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { DevSwitcher } from "@/components/dev/dev-switcher";
import { BlockedScreen } from "@/components/layout/blocked-screen";
import { Sidebar } from "@/components/layout/sidebar";
import { TELEGRAM_SDK_URL, TelegramInit } from "@/components/telegram/telegram-init";
import { getMe } from "@/lib/api";
import { I18nProvider } from "@/lib/i18n/client";
import { getT } from "@/lib/i18n/server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: "Ходімо", description: t.meta.description };
}

export const viewport: Viewport = {
  themeColor: "#141416",
  colorScheme: "dark",
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [me, { locale }] = await Promise.all([getMe(), getT()]);

  return (
    <html
      lang={locale}
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // SDK Telegram до гідрації дописує в style змінні --tg-viewport-*.
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <I18nProvider locale={locale}>
          {/*
            SDK Telegram Mini App: дає initData, коли сторінку відкрито в Telegram.
            Саме <script async>, а не next/script: React 19 сам підніме його в <head>
            і не сваритиметься при перемальовуванні layout на клієнті.
          */}
          <script src={TELEGRAM_SDK_URL} async />
          <TelegramInit signedInTelegramId={me?.telegramId ?? null} />

          {process.env.NODE_ENV === "development" && <DevSwitcher me={me} />}
          {me?.isBlocked ? (
            <main className="flex flex-1 flex-col">
              <BlockedScreen me={me} />
            </main>
          ) : (
            <>
              <Sidebar me={me} />
              <div className="flex flex-1 flex-col lg:pl-64">
                <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-12 lg:px-8 lg:pt-10">
                  {children}
                </main>
              </div>
            </>
          )}
        </I18nProvider>
      </body>
    </html>
  );
}
