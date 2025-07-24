import { trpc } from "../utils/trpc";
import { SessionProvider } from "next-auth/react";
import type { AppProps } from "next/app";
import { UserTypeProvider } from "@/components/principal/login/UserTypeContext"; // AJUSTE O PATH se necessário

import "../styles/globals.css";

function MyApp({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    <SessionProvider session={session}>
      <UserTypeProvider>
        <Component {...pageProps} />
      </UserTypeProvider>
    </SessionProvider>
  );
}

export default trpc.withTRPC(MyApp);
