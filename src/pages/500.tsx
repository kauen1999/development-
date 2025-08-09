// src/pages/500.tsx
import Head from "next/head";

export default function Custom500() {
  return (
    <>
      <Head>
        <title>Server error</title>
        <meta name="robots" content="noindex" />
      </Head>
      <main style={{ minHeight: "60vh", display: "grid", placeItems: "center", padding: "2rem" }}>
        <div style={{ textAlign: "center", maxWidth: 520 }}>
          <h1 style={{ fontSize: 28, marginBottom: 12 }}>Something went wrong (500)</h1>
          <p style={{ opacity: 0.8 }}>
            We&apos;re sorry, an unexpected error occurred. Please try again in a moment.
          </p>
        </div>
      </main>
    </>
  );
}
