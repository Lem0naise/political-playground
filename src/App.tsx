import { Routes, Route } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { GameProvider } from '@/contexts/GameContext';
import Home from '@/pages/Home';
import HomeNew from '@/pages/HomeNew';

export default function App() {
  const siteTitle = "The Political Playground - Election Simulation Game";
  const siteDesc = "If the Political Compass is not enough, try The Political Playground. Master the 7-axis voter simulation - strategy, polling, and political maneuvers in a deep, logic-driven campaign simulator.";
  const siteUrl = "https://polplay.indigo.spot";

  // Structured Data for Google Search Results
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "The Political Playground",
    "operatingSystem": "Web",
    "applicationCategory": "GameApplication",
    "genre": "Strategy, Simulation",
    "description": siteDesc,
    "codeRepository": "https://github.com/Lem0naise/political-playground/",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    }
  };

  return (
    <GameProvider>
      <Helmet>
        {/* Standard SEO */}
        <title>{siteTitle}</title>
        <meta name="description" content={siteDesc} />
        <meta name="keywords" content="election simulator, political strategy game, 7-axis political model, voter simulation, campaign manager game, grand strategy politics" />
        <link rel="canonical" href={siteUrl} />

        {/* Open Graph / Facebook / Discord */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={siteUrl} />
        <meta property="og:title" content={siteTitle} />
        <meta property="og:description" content={siteDesc} />
        <meta property="og:image" content={`${siteUrl}/og-preview.png`} />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={siteTitle} />
        <meta name="twitter:description" content={siteDesc} />
        <meta name="twitter:image" content={`${siteUrl}/twitter-card.png`} />

        {/* Structured Data Script */}
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      </Helmet>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/new" element={<HomeNew />} />
      </Routes>

      <footer className=" bottom-4 right-4 z-50 hover:opacity-90 transition-opacity bg-slate-900 flex justify-center p-2">
        <a
          href="https://github.com/Lem0naise/political-playground/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-center text-white text-xs font-mono flex items-center gap-1.5 bg-black/10 backdrop-blur-sm px-2 py-1 rounded-sm border border-black/5"
        >
          <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path></svg>
          Contribute (add your own country or party!)
        </a>
      </footer>
    </GameProvider>
  );
}