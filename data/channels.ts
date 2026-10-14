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
}

export interface GroupMeta {
  key: string;
  label: string;
  icon: string;
  color: string;
}

// Order here is the order the folders appear in on the Live TV page.
export const GROUPS: GroupMeta[] = [
  { key: 'General', label: 'General', icon: 'tv-outline', color: '#E63946' },
  { key: 'Sports', label: 'Sports', icon: 'football-outline', color: '#22C55E' },
  { key: 'Snooker', label: 'Snooker & Billiards', icon: 'ellipse-outline', color: '#0EA5E9' },
  { key: 'Kids', label: 'Kids', icon: 'happy-outline', color: '#F472B6' },
  { key: 'Movies', label: 'Movies', icon: 'film-outline', color: '#F59E0B' },
  { key: 'Series', label: 'Series', icon: 'albums-outline', color: '#14B8A6' },
  { key: 'News', label: 'News', icon: 'newspaper-outline', color: '#3B82F6' },
  { key: 'Entertainment', label: 'Entertainment', icon: 'sparkles-outline', color: '#A855F7' },
  { key: 'Culture', label: 'Documentary', icon: 'library-outline', color: '#8B5CF6' },
  { key: 'Religious', label: 'Religious', icon: 'moon-outline', color: '#7C3AED' },
  { key: 'Music', label: 'Music', icon: 'musical-notes-outline', color: '#EC4899' },
  { key: 'Lifestyle', label: 'Lifestyle', icon: 'cafe-outline', color: '#FB923C' },
  { key: 'Family', label: 'Family', icon: 'people-outline', color: '#F43F5E' },
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
  animation: 'Kids',
  cartoon: 'Kids',
  weather: 'News',
  business: 'News',
  legislative: 'News',
  public: 'General',
  sport: 'Sports',
  sports: 'Sports',
  football: 'Sports',
  outdoor: 'Sports',
  snooker: 'Snooker',
  billiards: 'Snooker',
  billiard: 'Snooker',
  auto: 'Lifestyle',
  cooking: 'Lifestyle',
  travel: 'Lifestyle',
  shop: 'Other',
  undefined: 'Other',
};

export function groupKeyFor(raw: string): string {
  const value = (raw || '').trim().toLowerCase();
  if (!value) return 'Other';
  const direct = GROUPS.find((item) => item.key.toLowerCase() === value);
  if (direct) return direct.key;
  return ALIASES[value] || 'Other';
}

export function groupMeta(key: string): GroupMeta {
  return GROUPS.find((item) => item.key === key) || UNKNOWN_GROUP;
}

interface SampleSeed {
  name: string;
  group: string;
}

const SAMPLE_SEED: SampleSeed[] = [
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
  { name: 'Press TV', group: 'News' },
  { name: 'Al-Alam', group: 'News' },
  { name: 'IRIB Varzesh', group: 'Sports' },
  { name: 'IRIB Pooya', group: 'Sports' },
  { name: 'IRIB Nahal', group: 'Kids' },
  { name: 'IRIB Quran', group: 'Religious' },
  { name: 'iFilm', group: 'Movies' },
  { name: 'IRIB Namayesh', group: 'Movies' },
  { name: 'IRIB Tamasha', group: 'Series' },
  { name: 'Manoto', group: 'Entertainment' },
  { name: 'GEM TV', group: 'Entertainment' },
  { name: 'BBC Persian', group: 'News' },
  { name: 'VOA Persian', group: 'News' },
  { name: 'Iran International', group: 'News' },
  { name: 'PMC', group: 'Music' },
];

export const SAMPLE_CHANNELS: Channel[] = SAMPLE_SEED.map((seed, index) => ({
  id: `sample-${index}`,
  name: seed.name,
  group: seed.group,
  logo: '',
  url: '',
  quality: '',
}));
    
