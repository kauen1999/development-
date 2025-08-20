import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="es"> {/* ou "es-AR" se for o caso */}
      <Head>
        <meta charSet="utf-8" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        {/* use crossOrigin vazio ou "anonymous" (não "true") */}
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
