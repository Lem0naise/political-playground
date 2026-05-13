export interface NewsPaperStyle {
  key: string;
  name: string;
  fontFamily: string;
  headlineFont: string;
  bodyFont: string;
  cardBg: string;
  cardFg: string;
  accent: string;
  headerBg: string;
  headerFg: string;
  headerFont: string;
  style: 'broadsheet' | 'broadcaster' | 'tabloid' | 'wire' | 'magazine' | 'local';
  logoText: string;
  /** Variation: some cards have a top bar, some a bottom bar, some full-header */
  headerLayout: 'topBar' | 'fullHeader' | 'bottomBar' | 'inline';
  /** Whether headline should be uppercase */
  uppercase: boolean;
}

const BASE_STYLES: NewsPaperStyle[] = [
  {
    key: 'nyt', name: 'The New York Times',
    fontFamily: "'Georgia', 'Times New Roman', serif",
    headlineFont: "'Georgia', serif",
    bodyFont: "'Georgia', serif",
    cardBg: '#FFFFFF', cardFg: '#121212', accent: '#121212',
    headerBg: '#121212', headerFg: '#FFFFFF',
    headerFont: "'Georgia', serif",
    style: 'broadsheet', logoText: 'The New York Times',
    headerLayout: 'topBar', uppercase: false,
  },
  {
    key: 'guardian', name: 'The Guardian',
    fontFamily: "'Guardian Text Egyptian Web', 'Georgia', serif",
    headlineFont: "'Georgia', serif",
    bodyFont: "'Georgia', serif",
    cardBg: '#052962', cardFg: '#FFFFFF', accent: '#FFE500',
    headerBg: '#052962', headerFg: '#FFE500',
    headerFont: "'Georgia', serif",
    style: 'broadsheet', logoText: 'The Guardian',
    headerLayout: 'fullHeader', uppercase: false,
  },
  {
    key: 'bbc', name: 'BBC News',
    fontFamily: "'Arial', 'Helvetica', sans-serif",
    headlineFont: "'Arial', 'Helvetica', sans-serif",
    bodyFont: "'Arial', 'Helvetica', sans-serif",
    cardBg: '#FFFFFF', cardFg: '#141414', accent: '#BB1919',
    headerBg: '#BB1919', headerFg: '#FFFFFF',
    headerFont: "'Arial', sans-serif",
    style: 'broadcaster', logoText: 'BBC News',
    headerLayout: 'topBar', uppercase: true,
  },
  {
    key: 'fox', name: 'Fox News',
    fontFamily: "'Arial', sans-serif",
    headlineFont: "'Arial Black', 'Impact', sans-serif",
    bodyFont: "'Arial', sans-serif",
    cardBg: '#F8F8F8', cardFg: '#111111', accent: '#003366',
    headerBg: '#003366', headerFg: '#FFFFFF',
    headerFont: "'Arial', sans-serif",
    style: 'broadcaster', logoText: 'Fox News',
    headerLayout: 'topBar', uppercase: true,
  },
  {
    key: 'cnn', name: 'CNN',
    fontFamily: "'Helvetica Neue', 'Arial', sans-serif",
    headlineFont: "'Helvetica Neue', 'Arial', sans-serif",
    bodyFont: "'Helvetica Neue', 'Arial', sans-serif",
    cardBg: '#0C0C0C', cardFg: '#FFFFFF', accent: '#CC0000',
    headerBg: '#CC0000', headerFg: '#FFFFFF',
    headerFont: "'Helvetica Neue', sans-serif",
    style: 'broadcaster', logoText: 'CNN',
    headerLayout: 'fullHeader', uppercase: true,
  },
  {
    key: 'reuters', name: 'Reuters',
    fontFamily: "'Helvetica Neue', 'Arial', sans-serif",
    headlineFont: "'Helvetica Neue', 'Arial', sans-serif",
    bodyFont: "'Georgia', serif",
    cardBg: '#FFFDF5', cardFg: '#333333', accent: '#FF8000',
    headerBg: '#FFFFFF', headerFg: '#FF8000',
    headerFont: "'Helvetica Neue', sans-serif",
    style: 'wire', logoText: 'Reuters',
    headerLayout: 'inline', uppercase: false,
  },
  {
    key: 'nypost', name: 'New York Post',
    fontFamily: "'Arial', sans-serif",
    headlineFont: "'Impact', 'Arial Black', sans-serif",
    bodyFont: "'Arial', sans-serif",
    cardBg: '#FFFFFF', cardFg: '#111111', accent: '#CF1920',
    headerBg: '#CF1920', headerFg: '#FFFFFF',
    headerFont: "'Impact', sans-serif",
    style: 'tabloid', logoText: 'New York Post',
    headerLayout: 'topBar', uppercase: true,
  },
  {
    key: 'economist', name: 'The Economist',
    fontFamily: "'Georgia', 'Times New Roman', serif",
    headlineFont: "'Georgia', serif",
    bodyFont: "'Georgia', serif",
    cardBg: '#FFFDF4', cardFg: '#121212', accent: '#E3120B',
    headerBg: '#121212', headerFg: '#FFFFFF',
    headerFont: "'Georgia', serif",
    style: 'magazine', logoText: 'The Economist',
    headerLayout: 'bottomBar', uppercase: false,
  },
  {
    key: 'dailymail', name: 'Daily Mail',
    fontFamily: "'Arial', sans-serif",
    headlineFont: "'Arial Black', 'Arial', sans-serif",
    bodyFont: "'Arial', sans-serif",
    cardBg: '#FFFFFF', cardFg: '#111111', accent: '#0064A8',
    headerBg: '#0064A8', headerFg: '#FFFFFF',
    headerFont: "'Arial Black', sans-serif",
    style: 'tabloid', logoText: 'Daily Mail',
    headerLayout: 'topBar', uppercase: true,
  },
  {
    key: 'wsj', name: 'Wall Street Journal',
    fontFamily: "'Times New Roman', 'Georgia', serif",
    headlineFont: "'Times New Roman', serif",
    bodyFont: "'Times New Roman', serif",
    cardBg: '#FDFDF9', cardFg: '#222222', accent: '#6698B1',
    headerBg: '#FAFAFA', headerFg: '#222222',
    headerFont: "'Times New Roman', serif",
    style: 'broadsheet', logoText: 'The Wall Street Journal',
    headerLayout: 'inline', uppercase: false,
  },
  {
    key: 'spiegel', name: 'Der Spiegel',
    fontFamily: "'Helvetica Neue', 'Arial', sans-serif",
    headlineFont: "'Helvetica Neue', 'Arial', sans-serif",
    bodyFont: "'Georgia', serif",
    cardBg: '#FFFFFF', cardFg: '#111111', accent: '#CC0000',
    headerBg: '#CC0000', headerFg: '#FFFFFF',
    headerFont: "'Helvetica Neue', sans-serif",
    style: 'broadsheet', logoText: 'Der Spiegel',
    headerLayout: 'fullHeader', uppercase: false,
  },
  {
    key: 'lemonde', name: 'Le Monde',
    fontFamily: "'Georgia', 'Times New Roman', serif",
    headlineFont: "'Georgia', serif",
    bodyFont: "'Georgia', serif",
    cardBg: '#FFFFFF', cardFg: '#1A1A1A', accent: '#1A1A1A',
    headerBg: '#F5F5F5', headerFg: '#1A1A1A',
    headerFont: "'Georgia', serif",
    style: 'broadsheet', logoText: 'Le Monde',
    headerLayout: 'inline', uppercase: false,
  },
  {
    key: 'local', name: 'Local Gazette',
    fontFamily: "'Georgia', 'Times New Roman', serif",
    headlineFont: "'Georgia', serif",
    bodyFont: "'Georgia', serif",
    cardBg: '#FFFEF8', cardFg: '#2D2D2D', accent: '#8B4513',
    headerBg: '#8B4513', headerFg: '#FFFFFF',
    headerFont: "'Georgia', serif",
    style: 'local', logoText: 'Local Gazette',
    headerLayout: 'bottomBar', uppercase: false,
  },
];

export interface PaperAssignment {
  name: string;
  style: NewsPaperStyle;
}

const NAME_TO_STYLE: [RegExp, string][] = [
  [/^The New York Times$/i, 'nyt'],
  [/^The Washington Post$/i, 'nypost'],
  [/^The Wall Street Journal$/i, 'wsj'],
  [/^USA Today$/i, 'cnn'],
  [/^Los Angeles Times$/i, 'nyt'],
  [/^The Guardian$/i, 'guardian'],
  [/^The Observer$/i, 'guardian'],
  [/^BBC News$/i, 'bbc'],
  [/^Fox News$/i, 'fox'],
  [/^CNN$/i, 'cnn'],
  [/^Reuters$/i, 'reuters'],
  [/^The Economist$/i, 'economist'],
  [/^The Daily Mail$/i, 'dailymail'],
  [/^The Telegraph$/i, 'telegraph'],
  [/^Daily Telegraph$/i, 'telegraph'],
  [/^Der Spiegel$/i, 'spiegel'],
  [/^Le Monde$/i, 'lemonde'],
  [/^Le Figaro$/i, 'lemonde'],
  [/^The Times$/i, 'nyt'],
  [/^Financial Times$/i, 'wsj'],
  [/^The Sun$/i, 'nypost'],
  [/^Metro$/i, 'bbc'],
  [/^New York Post$/i, 'nypost'],
  [/^The Sydney Morning Herald$/i, 'guardian'],
  [/^The Age$/i, 'guardian'],
  [/^The Australian$/i, 'guardian'],
  [/^Herald Sun$/i, 'fox'],
  [/^The Globe and Mail$/i, 'guardian'],
  [/^Toronto Star$/i, 'cnn'],
  [/^National Post$/i, 'nypost'],
  [/^South China Morning Post$/i, 'nyt'],
  [/^China Daily$/i, 'fox'],
  [/^The Japan Times$/i, 'nyt'],
  [/^The Nikkei$/i, 'wsj'],
  [/^The Korea Times$/i, 'nyt'],
  [/^The Korea Herald$/i, 'guardian'],
  [/^The Jerusalem Post$/i, 'guardian'],
  [/^The Times of India$/i, 'nyt'],
  [/^The Hindu$/i, 'guardian'],
  [/^Hindustan Times$/i, 'cnn'],
  [/^The Indian Express$/i, 'guardian'],
  [/^The Economic Times$/i, 'wsj'],
  [/^People'?s Daily$/i, 'fox'],
  [/^Global Times$/i, 'fox'],
  [/^Pravda$/i, 'fox'],
  [/^Izvestia$/i, 'wsj'],
  [/^Kommersant$/i, 'wsj'],
  [/^Novaya Gazeta$/i, 'spiegel'],
  [/^Süddeutsche Zeitung$/i, 'spiegel'],
  [/^Frankfurter Allgemeine$/i, 'wsj'],
  [/^Die Zeit$/i, 'economist'],
  [/^Die Welt$/i, 'guardian'],
  [/^Bild$/i, 'dailymail'],
  [/^Postimees$/i, 'cnn'],
  [/^Õhtuleht$/i, 'nypost'],
  [/^Eesti Päevaleht$/i, 'guardian'],
  [/^Äripäev$/i, 'wsj'],
  [/^ERR Uudised$/i, 'bbc'],
  [/^Delfi$/i, 'reuters'],
  [/^Maaleht$/i, 'local'],
  [/^Lääne Elu$/i, 'local'],
  [/^Virumaa Teataja$/i, 'local'],
  [/^Pärnu Postimees$/i, 'cnn'],
  [/^Corriere della Sera$/i, 'spiegel'],
  [/^La Repubblica$/i, 'guardian'],
  [/^La Stampa$/i, 'nyt'],
  [/^Il Sole 24 Ore$/i, 'economist'],
  [/^El País$/i, 'guardian'],
  [/^El Mundo$/i, 'spiegel'],
  [/^Le Soir$/i, 'lemonde'],
  [/^De Standaard$/i, 'lemonde'],
  [/^De Telegraaf$/i, 'dailymail'],
  [/^de Volkskrant$/i, 'guardian'],
  [/^NRC Handelsblad$/i, 'nyt'],
  [/^Dagens Nyheter$/i, 'guardian'],
  [/^Aftonbladet$/i, 'dailymail'],
  [/^Helsingin Sanomat$/i, 'nyt'],
  [/^Ilta-Sanomat$/i, 'dailymail'],
  [/^Jyllands-Posten$/i, 'nyt'],
  [/^Politiken$/i, 'guardian'],
  [/^Yomiuri Shimbun$/i, 'nyt'],
  [/^Asahi Shimbun$/i, 'guardian'],
  [/^Mainichi Shimbun$/i, 'cnn'],
  [/^Kathimerini$/i, 'nyt'],
  [/^Hürriyet$/i, 'fox'],
  [/^Haaretz$/i, 'guardian'],
  [/^Chosun Ilbo$/i, 'nyt'],
  [/^JoongAng Ilbo$/i, 'guardian'],
  [/^Al-Ahram$/i, 'fox'],
  [/^Kyiv Independent$/i, 'cnn'],
  [/^Kyiv Post$/i, 'guardian'],
  [/^Folha de S.Paulo$/i, 'guardian'],
  [/^O Globo$/i, 'spiegel'],
  [/^La Nación$/i, 'nyt'],
  [/^Clarín$/i, 'dailymail'],
  [/^El Universal$/i, 'fox'],
  [/^Kyiv Independent$/i, 'cnn'],
  [/^Gazeta Wyborcza$/i, 'guardian'],
  [/^Rzeczpospolita$/i, 'nyt'],
  [/^Aftenposten$/i, 'nyt'],
  [/^Verdens Gang$/i, 'cnn'],
  [/^Dagbladet$/i, 'dailymail'],
  [/^El Mercurio$/i, 'nyt'],
  [/^La Tercera$/i, 'guardian'],
];

function hashToStyle(name: string): NewsPaperStyle {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash |= 0;
  }
  return BASE_STYLES[Math.abs(hash) % BASE_STYLES.length];
}

export function matchPaperStyle(name: string): NewsPaperStyle {
  const lower = name.trim().toLowerCase();
  for (const [regex, key] of NAME_TO_STYLE) {
    if (regex.test(lower)) {
      return BASE_STYLES.find(s => s.key === key) || BASE_STYLES[0];
    }
  }
  return hashToStyle(name);
}

export function getRandomPaperAssignment(eventVariables: any, country: string): PaperAssignment {
  let countryPapers: string[] = [];

  if (eventVariables?.countrySpecific?.[country]?.newspaper?.length > 0) {
    countryPapers = [...eventVariables.countrySpecific[country].newspaper];
  }

  const genericFallback = eventVariables?.generic?.newspaper?.length > 0
    ? eventVariables.generic.newspaper
    : ['The Daily News', 'The Times', 'The Gazette', 'The Herald', 'The Post'];

  // Pad with generic papers to ensure at least 13 names (one per visual style)
  while (countryPapers.length < 13) {
    for (const gp of genericFallback) {
      if (!countryPapers.includes(gp)) {
        countryPapers.push(gp);
        if (countryPapers.length >= 13) break;
      }
    }
    // If still < 13 (all generics are already in), break to avoid infinite loop
    if (countryPapers.length < 13) break;
  }

  const name = countryPapers[Math.floor(Math.random() * countryPapers.length)];
  const style = matchPaperStyle(name);
  return { name, style };
}

export function getPriorityBadge(priority: string): { label: string; color: string; bg: string } | null {
  if (priority !== 'critical') return null;
  return { label: 'BREAKING', color: '#DC2626', bg: '#7F1D1D' };
}
