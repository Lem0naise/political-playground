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
    </GameProvider>
  );
}