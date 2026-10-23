// Channel model, category styling and the offline fallback list for Arshia TV.
//
// The real channel list — with working stream URLs and logos — is loaded from a public
// free-to-air playlist in utils/playlist.ts. SAMPLE_CHANNELS is the fallback shown only
// when that playlist cannot be reached: it carries names and categories, never a made-up
// stream address, so the app never pretends a dead link is a live channel.

export interface Channel {
  id: string;
  name: string;
  group: string;
  logo: string;
  url: string;
  quality: string;
  // Other addresses published for the same channel, tried automatically when a stream drops.
  backupUrls?: string[];
}

export interface GroupMeta {
  key: string;
  label: string;
  icon: string;
  color: string;
}

// Order here is the order the folders appear in on the Live TV page.
// Added Snooker, Wrestling, Nature, History, Religion, Motivation, Music, Cooking,
// Lifestyle and Family shelves for fuller coverage.
export const GROUPS: GroupMeta[] = [
  { key: 'General', label: 'General', icon: 'tv-outline', color: '#E63946' },
  { key: 'Sports', label: 'Sports', icon: 'football-outline', color: '#22C55E' },
  { key: 'Snooker', label: 'Snooker & Billiards', icon: 'ellipse-outline', color: '#0EA5E9' },
  { key: 'Wrestling', label: 'Wrestling & Combat', icon: 'body-outline', color: '#EF4444' },
  { key: 'Kids', label: 'Kids', icon: 'happy-outline', color: '#F472B6' },
  { key: 'Movies', label: 'Movies', icon: 'film-outline', color: '#F59E0B' },
  { key: 'Series', label: 'Series', icon: 'albums-outline', color: '#14B8A6' },
  { key: 'News', label: 'News', icon: 'newspaper-outline', color: '#3B82F6' },
  { key: 'Entertainment', label: 'Entertainment', icon: 'sparkles-outline', color: '#A855F7' },
  { key: 'Culture', label: 'Documentary', icon: 'library-outline', color: '#8B5CF6' },
  { key: 'Nature', label: 'Nature & Wildlife', icon: 'leaf-outline', color: '#10B981' },
  { key: 'History', label: 'History', icon: 'hourglass-outline', color: '#D97706' },
  { key: 'Religious', label: 'Religion & Faith', icon: 'moon-outline', color: '#7C3AED' },
  { key: 'Motivation', label: 'Motivation', icon: 'flash-outline', color: '#EAB308' },
  { key: 'Music', label: 'Music & Dance', icon: 'musical-notes-outline', color: '#EC4899' },
  { key: 'Cooking', label: 'Cooking & Food', icon: 'restaurant-outline', color: '#F97316' },
  { key: 'Lifestyle', label: 'Lifestyle', icon: 'cafe-outline', color: '#FB923C' },
  { key: 'Family', label: 'Family & Parenting', icon: 'people-outline', color: '#F43F5E' },
  { key: 'Other', label: 'Other', icon: 'ellipsis-horizontal-circle-outline', color: '#6C7A90' },
];

const UNKNOWN_GROUP: GroupMeta = GROUPS[GROUPS.length - 1];

// Playlists use many spellings for the same shelf; fold the common ones onto our groups.
const ALIASES: Record<string, string> = {
  cinema: 'Movies',
  classic: 'Movies',
  film: 'Movies',
  films: 'Movies',
  documentary: 'Culture',
  science: 'Culture',
  education: 'Culture',
  culture: 'Culture',
  nature: 'Nature',
  wildlife: 'Nature',
  animal: 'Nature',
  animals: 'Nature',
  history: 'History',
  animation: 'Kids',
  cartoon: 'Kids',
  weather: 'News',
  business: 'News',
  legislative: 'News',
  public: 'General',
  sport: 'Sports',
  sports: 'Sports',
  football: 'Sports',
  outdoor: 'Nature',
  snooker: 'Snooker',
  billiards: 'Snooker',
  billiard: 'Snooker',
  wrestling: 'Wrestling',
  wwe: 'Wrestling',
  mma: 'Wrestling',
  ufc: 'Wrestling',
  combat: 'Wrestling',
  religion: 'Religious',
  religious: 'Religious',
  islamic: 'Religious',
  christian: 'Religious',
  faith: 'Religious',
  motivation: 'Motivation',
  motivational: 'Motivation',
  selfimprovement: 'Motivation',
  music: 'Music',
  dance: 'Music',
  cooking: 'Cooking',
  food: 'Cooking',
  culinary: 'Cooking',
  family: 'Family',
  parenting: 'Family',
  children: 'Kids',
  kids: 'Kids',
  auto: 'Lifestyle',
  travel: 'Lifestyle',
  shop: 'Other',
  undefined: 'Other',
};

export function groupKeyFor(raw: string): string {
  const value = (raw || '').trim().toLowerCase();
  if (!value) return 'Other';

  // Exact group key match
  const direct = GROUPS.find((item) => item.key.toLowerCase() === value);
  if (direct) return direct.key;

  // Exact alias match
  if (ALIASES[value]) return ALIASES[value];

  // Playlists often ship compound / localized titles.
  // Match by keyword (EN + FA) so every channel lands in a real folder — never dropped.
  const rules: Array<{ key: string; needles: string[] }> = [
    { key: 'Snooker', needles: ['snooker', 'billiard', 'بیلیارد', 'اسنوکر'] },
    { key: 'Wrestling', needles: ['wrestl', 'wwe', 'aew', 'mma', 'ufc', 'combat', 'boxing', 'fight', 'کشتی', 'کشتی کج', 'رزمی'] },
    { key: 'Sports', needles: ['sport', 'football', 'soccer', 'varzesh', 'beinsport', 'espn', 'olympi', 'ورزش', 'فوتبال'] },
    { key: 'Kids', needles: ['kid', 'children', 'cartoon', 'animation', 'pooya', 'nahal', 'child', 'کودک', 'کارتون', 'پویا', 'نهال'] },
    { key: 'Movies', needles: ['movie', 'film', 'cinema', 'namayesh', 'فیلم', 'سینما', 'نمایش'] },
    { key: 'Series', needles: ['series', 'serial', 'drama', 'tamasha', 'سریال', 'تماشا'] },
    { key: 'News', needles: ['news', 'irinn', 'خبر', 'current affairs', 'اخبار'] },
    { key: 'Entertainment', needles: ['entertainment', 'variety', 'manoto', 'gem', 'show', 'سرگرمی'] },
    { key: 'Nature', needles: ['nature', 'wildlife', 'animal', 'outdoor', 'geo', 'nat geo', 'discovery', 'حیات وحش', 'طبیعت', 'حیوانات'] },
    { key: 'History', needles: ['history', 'historic', 'history channel', 'تاریخ'] },
    { key: 'Culture', needles: ['document', 'culture', 'science', 'education', 'mostanad', 'amoozesh', 'مستند', 'علمی', 'آموزش'] },
    { key: 'Religious', needles: ['religio', 'quran', 'islam', 'faith', 'christian', 'قرائ', 'قرآن', 'مذهبی', 'دینی'] },
    { key: 'Motivation', needles: ['motivat', 'self help', 'self-help', 'inspir', 'انگیزش', 'موفقیت'] },
    { key: 'Music', needles: ['music', 'dance', 'pmc', 'tapesh', 'آهنگ', 'موسیقی'] },
    { key: 'Cooking', needles: ['cook', 'food', 'culinary', 'آشپز', 'غذا'] },
    { key: 'Lifestyle', needles: ['lifestyle', 'travel', 'auto', 'shop', 'سفر', 'خودرو'] },
    { key: 'Family', needles: ['family', 'parent', 'خانواده'] },
    { key: 'General', needles: ['general', 'public', 'irib', 'national', 'provincial', 'سراسری', 'استانی', 'ماهواره'] },
  ];

  for (const rule of rules) {
    if (rule.needles.some((n) => value.includes(n))) return rule.key;
  }

  return 'Other';
}

/** Refine folder using channel name when group-title was weak/generic. */
export function refineGroupByName(group: string, name: string): string {
  const n = (name || '').toLowerCase();
  if (!n) return group;

  // Strong name signals override weak groups
  if (/wwe|aew|ufc|mma|wrestling|کشتی|combat sport|boxing|bellator|impact wrestling/i.test(n)) return 'Wrestling';
  if (/snooker|billiard|pool championship|بیلیارد|اسنوکر/i.test(n)) return 'Snooker';
  if (/nat geo|national geographic|discovery|animal planet|wildlife|حیات وحش|طبیعت|earth|ocean|safari/i.test(n)) return 'Nature';
  if (/history channel|history tv|تاریخ|ancient|civilization/i.test(n)) return 'History';
  if (/motivat|tedx|success|inspir|انگیزش|موفقیت|self.?help/i.test(n)) return 'Motivation';
  if (/cartoon|nick(?:elodeon)?|disney junior|boomerang|پویا|نهال|کودک|کارتون/i.test(n) && group !== 'Kids') return 'Kids';
  if (/quran|قرآن|islamic|مذهب/i.test(n)) return 'Religious';
  if (/beinsport|espn|sky sports|fox sports|varzesh|ورزش|فوتبال|uefa|nba|nfl/i.test(n) && group === 'Other') return 'Sports';

  return group;
}

export function groupMeta(key: string): GroupMeta {
  return GROUPS.find((item) => item.key === key) || UNKNOWN_GROUP;
}

interface SampleSeed {
  name: string;
  group: string;
}

const SAMPLE_SEED: SampleSeed[] = [
  // IRIB and domestic
  { name: 'IRIB TV1', group: 'General' },
  { name: 'IRIB TV2', group: 'General' },
  { name: 'IRIB TV3', group: 'General' },
  { name: 'IRIB TV4', group: 'General' },
  { name: 'IRIB TV5', group: 'General' },
  { name: 'IRIB Shoma', group: 'General' },
  { name: 'IRIB Ofogh', group: 'General' },
  { name: 'IRIB Amoozesh', group: 'Culture' },
  { name: 'IRIB Mostanad', group: 'Culture' },
  { name: 'IRIB IRINN', group: 'News' },
  { name: 'IRIB World', group: 'News' },
  { name: 'IRIB Varzesh', group: 'Sports' },
  { name: 'IRIB Pooya', group: 'Kids' },
  { name: 'IRIB Nahal', group: 'Kids' },
  { name: 'IRIB Quran', group: 'Religious' },
  { name: 'IRIB Namayesh', group: 'Movies' },
  { name: 'IRIB Tamasha', group: 'Series' },

  // Persian satellite / international Persian-language channels
  { name: 'BBC Persian', group: 'News' },
  { name: 'VOA Persian', group: 'News' },
  { name: 'Iran International', group: 'News' },
  { name: 'Manoto', group: 'Entertainment' },
  { name: 'GEM TV', group: 'Entertainment' },
  { name: 'PMC', group: 'Music' },
  { name: 'Farsi1', group: 'Entertainment' },
  { name: 'MBC Persia', group: 'Entertainment' },
  { name: 'Tapesh TV', group: 'Music' },
  { name: 'Persia TV', group: 'Entertainment' },
  { name: 'Pars TV', group: 'Entertainment' },
  { name: 'Simaye Azadi', group: 'News' },
  { name: 'Zagros TV', group: 'General' },

  // Sports & combat / wrestling
  { name: 'WWE Network', group: 'Sports' },
  { name: 'AEW', group: 'Sports' },
  { name: 'UFC Fight Pass', group: 'Sports' },
  { name: 'Boxing Channel', group: 'Sports' },
  { name: 'Combat Sports HD', group: 'Sports' },
  { name: 'BeIN Sports 1', group: 'Sports' },
  { name: 'BeIN Sports 2', group: 'Sports' },
  { name: 'ESPN', group: 'Sports' },
  { name: 'Sky Sports Main Event', group: 'Sports' },
  { name: 'Fox Sports', group: 'Sports' },
  { name: 'NBC Sports', group: 'Sports' },
  { name: 'DAZN', group: 'Sports' },
  { name: 'Eurosport', group: 'Sports' },
  { name: 'Red Bull TV', group: 'Sports' },
  { name: 'MotorTrend', group: 'Sports' },

  // General sports / regional sports
  { name: 'IRIB Varzesh 2', group: 'Sports' },
  { name: 'Asian Sports', group: 'Sports' },
  { name: 'Local Football Feed', group: 'Sports' },

  // Wildlife / Nature
  { name: 'National Geographic', group: 'Nature' },
  { name: 'Nat Geo Wild', group: 'Nature' },
  { name: 'BBC Earth', group: 'Nature' },
  { name: 'Animal Planet', group: 'Nature' },
  { name: 'Nature & Wildlife', group: 'Nature' },
  { name: 'Wildlife Live', group: 'Nature' },

  // Documentary / History
  { name: 'Discovery Channel', group: 'Culture' },
  { name: 'History Channel', group: 'History' },
  { name: 'Science Channel', group: 'Culture' },
  { name: 'Discovery Science', group: 'Culture' },
  { name: 'CuriosityStream', group: 'History' },

  // Cooking
  { name: 'Food Network', group: 'Cooking' },
  { name: 'Tasty', group: 'Cooking' },
  { name: 'BBC Good Food', group: 'Cooking' },
  { name: 'Cooking Channel', group: 'Cooking' },

  // Wrestling / Combat
  { name: 'WWE Network', group: 'Wrestling' },
  { name: 'UFC Fight Pass', group: 'Wrestling' },
  { name: 'Combat Sports', group: 'Wrestling' },

  // Motivation
  { name: 'Motivation Daily', group: 'Motivation' },
  { name: 'Success Channel', group: 'Motivation' },

  // Music & Entertainment
  { name: 'MTV', group: 'Music' },
  { name: 'VH1', group: 'Music' },
  { name: 'Kanal Music', group: 'Music' },
  { name: 'Classic Hits', group: 'Music' },
  { name: 'Entertainment HD', group: 'Entertainment' },

  // Family / Kids
  { name: 'Cartoon Network', group: 'Kids' },
  { name: 'Nickelodeon', group: 'Kids' },
  { name: 'Disney Channel', group: 'Kids' },
  { name: 'Disney Junior', group: 'Kids' },
  { name: 'Family Home', group: 'Family' },

  // Lifestyle / Travel / Home
  { name: 'Travel Channel', group: 'Lifestyle' },
  { name: 'Home & Garden', group: 'Lifestyle' },

  // Other / specialty
  { name: 'Weather Channel', group: 'Other' },
  { name: 'Traffic Live', group: 'Other' },
  { name: 'Local Community TV', group: 'Other' },
];

export const SAMPLE_CHANNELS: Channel[] = SAMPLE_SEED.map((seed, index) => ({
  id: `sample-${index}`,
  name: seed.name,
  group: seed.group,
  logo: '',
  url: '',
  quality: '',
}));
