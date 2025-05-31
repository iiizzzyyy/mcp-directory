import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <body>
        <Main />
        <NextScript />
        {/* Add a script to detect client-side rendering */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // This script helps handle client-side detection
              window.__IS_CLIENT__ = true;
            `,
          }}
        />
      </body>
    </Html>
  );
}
