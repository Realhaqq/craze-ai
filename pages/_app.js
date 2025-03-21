import '../styles/globals.css';
import { useEffect } from 'react';

function MyApp({ Component, pageProps }) {
  // Force a full page refresh to ensure CSS loads properly in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      document.documentElement.classList.add('dev-mode');
    }
  }, []);

  return <Component {...pageProps} />;
}

export default MyApp;
