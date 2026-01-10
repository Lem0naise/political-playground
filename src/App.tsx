import { Routes, Route } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { GameProvider } from '@/contexts/GameContext';
import Home from '@/pages/Home';
import HomeNew from '@/pages/HomeNew';

export default function App() {
  return (
    <GameProvider>
      <Helmet>
        <title>The Political Playground - Fictional Election Simulator</title>
        <meta
          name="description"
          content="A fictional political simulation game for entertainment and educational purposes. Does not reflect real politics or endorse any political views."
        />
        <meta
          name="keywords"
          content="political simulation, election game, campaign simulator, educational game, fictional politics"
        />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content="The Political Playground - Fictional Election Simulator" />
        <meta property="og:description" content="A fictional political simulation game for entertainment purposes only" />
        <meta property="og:type" content="website" />
      </Helmet>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/new" element={<HomeNew />} />
      </Routes>
    </GameProvider>
  );
}
