// pages/_app.js
import '../styles/globals.css'; // Bu satır tüm sitede Tailwind'i çalıştıracak

function MyApp({ Component, pageProps }) {
    return <Component {...pageProps} />;
}

export default MyApp;