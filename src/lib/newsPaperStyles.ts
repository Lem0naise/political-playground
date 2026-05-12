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
  [/new york times/i, 'nyt'],
  [/guardian/i, 'guardian'],
  [/bbc/i, 'bbc'],
  [/fox/i, 'fox'],
  [/cnn/i, 'cnn'],
  [/reuters/i, 'reuters'],
  [/post/i, 'nypost'],        // Washington Post, New York Post, National Post
  [/economist/i, 'economist'],
  [/daily mail/i, 'dailymail'],
  [/mail/i, 'dailymail'],
  [/wall street/i, 'wsj'],
  [/journal/i, 'wsj'],
  [/spiegel/i, 'spiegel'],
  [/le monde/i, 'lemonde'],
  [/le figaro/i, 'lemonde'],
  [/times/i, 'nyt'],           // LA Times, Financial Times, Times of India
  [/telegraph/i, 'telegraph'],
  [/usa today/i, 'cnn'],
  [/süddeutsche/i, 'spiegel'],
  [/frankfurter/i, 'wsj'],
  [/zeit/i, 'economist'],
  [/globe/i, 'guardian'],
  [/star/i, 'cnn'],
  [/herald/i, 'guardian'],
  [/gazette|press|chronicle|echo|dispatch/i, 'local'],
  [/people'?s daily/i, 'fox'],
  [/pravda/i, 'fox'],
  [/izvestia|kommersant/i, 'wsj'],
  [/shimbun/i, 'nyt'],
  [/nikkei/i, 'wsj'],
  [/hindu/i, 'guardian'],
  [/hindustan/i, 'cnn'],
  [/postimees|eesti|balti/i, 'cnn'],
  [/õhtuleht/i, 'nypost'],
  [/Äripäev/i, 'wsj'],
  [/err/i, 'bbc'],
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
  const lower = name.toLowerCase();
  for (const [regex, key] of NAME_TO_STYLE) {
    if (regex.test(lower)) {
      return BASE_STYLES.find(s => s.key === key) || BASE_STYLES[0];
    }
  }
  return hashToStyle(name);
}

export function getRandomPaperAssignment(eventVariables: any, country: string): PaperAssignment {
  let newspapers: string[] = [];

  if (eventVariables?.countrySpecific?.[country]?.newspaper?.length > 0) {
    newspapers = eventVariables.countrySpecific[country].newspaper;
  } else if (eventVariables?.generic?.newspaper?.length > 0) {
    newspapers = eventVariables.generic.newspaper;
  }

  if (newspapers.length === 0) {
    newspapers = ['The Daily News', 'The Times', 'The Gazette', 'The Herald', 'The Post'];
  }

  const name = newspapers[Math.floor(Math.random() * newspapers.length)];
  const style = matchPaperStyle(name);
  return { name, style };
}

export function getPriorityBadge(priority: string): { label: string; color: string; bg: string } | null {
  if (priority !== 'critical') return null;
  return { label: 'BREAKING', color: '#DC2626', bg: '#7F1D1D' };
}
