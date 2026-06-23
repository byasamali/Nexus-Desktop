import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
    return (
        <Html lang="tr">
            <Head>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes" />
                <meta name="description" content="Pratikecza — Eczane Yönetim Sistemi" />
                <meta name="theme-color" content="#ffffff" />
            </Head>
            <body>
                <Main />
                <NextScript />
            </body>
        </Html>
    );
}
