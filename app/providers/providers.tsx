"use client";

import { AppProvider } from "@shopify/polaris";
import "@shopify/polaris/build/esm/styles.css";
import translations from "@shopify/polaris/locales/en.json";
import SessionProvider from "./session-provider";
import { TanstackProvider } from "./tanstack-provider";
import Link from "next/link";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider i18n={translations}>
      <TanstackProvider>
        <ui-nav-menu>
          <Link href="/royal/products">Royal Products</Link>
          <Link href="/products">Shopify Products</Link>

          {/* <Link href="/royal/">orders</Link> */}

        </ui-nav-menu>
        <SessionProvider>{children}</SessionProvider>
      </TanstackProvider>
    </AppProvider>
  );
}

export function ExitProvider({ children }: { children: React.ReactNode }) {
  return <AppProvider i18n={translations}>{children}</AppProvider>;
}
