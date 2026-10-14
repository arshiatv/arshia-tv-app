// Series catalogue for the Series shelf.
//
// Like the film catalogue, no stream address is attached to an episode: playing one opens
// the Arshia TV player, which says plainly that the source is not attached yet. Episode
// names are not invented either — an episode is shown by its number and length.

export interface Episode {
  id: string;
  number: number;
  duration: number;
}

export interface Season {
  id: string;
  number: number;
  episodes: Episode[];
}

export interface Series {
  id: string;
  title: string;
  titleFa: string;
  year: number;
  genre: string;
  rating: number;
  country: string;
  countryFa: string;
  synopsis: string;
  synopsisFa: string;
  color: string;
  icon: string;
  seasons: Season[];
}

function season(seriesId: string, number: number, episodes: number, firstLength: number): Season {
  return {
    id: `${seriesId}-s${number}`,
    number,
    episodes: Array.from({ length: episodes }, (_, index) => ({
      id: `${seriesId}-s${number}-e${index + 1}`,
      number: index + 1,
      duration: firstLength + ((index * 5) % 12),
    })),
  };
}

export const SERIES: Series[] = [
  {
    id: 'sr1',
    title: 'Shahrzad',
    titleFa: 'شهرزاد',
    year: 2015,
    genre: 'Drama',
    rating: 8.4,
    country: 'Iran',
    countryFa: 'ایران',
    synopsis:
      'Tehran in the 1950s: a young woman marries into a powerful family and finds the whole city is watching.',
    synopsisFa:
      'تهران دهه سی: دختری جوان به خانواده‌ای قدرتمند وارد می‌شود و می‌بیند تمام شهر او را زیر نظر دارد.',
    color: '#E63946',
    icon: 'rose-outline',
    seasons: [season('sr1', 1, 20, 45), season('sr1', 2, 15, 46), season('sr1', 3, 12, 44)],
  },
  {
    id: 'sr2',
    title: 'Paytakht',
    titleFa: 'پایتخت',
    year: 2011,
    genre: 'Family',
    rating: 8.1,
    country: 'Iran',
    countryFa: 'ایران',
    synopsis:
      'A family from the north of Iran moves to Tehran and turns every ordinary day into an adventure.',
    synopsisFa:
      'خانواده‌ای از شمال ایران به تهران می‌آید و هر روز ساده‌ی زندگی را به یک ماجرا تبدیل می‌کند.',
    color: '#22C55E',
    icon: 'home-outline',
    seasons: [season('sr2', 1, 15, 40), season('sr2', 2, 15, 41), season('sr2', 3, 18, 39)],
  },
  {
    id: 'sr3',
    title: 'Jeyran',
    titleFa: 'جیران',
    year: 2022,
    genre: 'Drama',
    rating: 7.6,
    country: 'Iran',
    countryFa: 'ایران',
    synopsis:
      'A historical romance from the Qajar court, where love and politics are played with the same hand.',
    synopsisFa:
      'عاشقانه‌ای تاریخی از دربار قاجار، جایی که عشق و سیاست با یک دست بازی می‌شوند.',
    color: '#A855F7',
    icon: 'fitness-outline',
    seasons: [season('sr3', 1, 20, 48), season('sr3', 2, 18, 47)],
  },
  {
    id: 'sr4',
    title: 'Breaking Bad',
    titleFa: 'بریکینگ بد',
    year: 2008,
    genre: 'Drama',
    rating: 9.5,
    country: 'USA',
    countryFa: 'آمریکا',
    synopsis:
      'A chemistry teacher with a terminal diagnosis starts cooking, and every season costs him another piece of himself.',
    synopsisFa:
      'معلم شیمی‌ای که خبر بیماری‌اش را گرفته وارد کار خطرناکی می‌شود و هر فصل تکه‌ای دیگر از خودش را از دست می‌دهد.',
    color: '#14B8A6',
    icon: 'flask-outline',
    seasons: [season('sr4', 1, 7, 47), season('sr4', 2, 13, 46), season('sr4', 3, 13, 47)],
  },
  {
    id: 'sr5',
    title: 'Dark',
    titleFa: 'تاریک',
    year: 2017,
    genre: 'Sci-Fi',
    rating: 8.7,
    country: 'Germany',
    countryFa: 'آلمان',
    synopsis:
      'Four families in a small German town trace a missing child back through sixty-six years of the same story.',
    synopsisFa:
      'چهار خانواده در شهری کوچک در آلمان رد یک کودک گمشده را در شصت‌وشش سال از یک داستان دنبال می‌کنند.',
    color: '#3B82F6',
    icon: 'time-outline',
    seasons: [season('sr5', 1, 10, 51), season('sr5', 2, 8, 55), season('sr5', 3, 8, 58)],
  },
  {
    id: 'sr6',
    title: 'Money Heist',
    titleFa: 'خانه کاغذی',
    year: 2017,
    genre: 'Thriller',
    rating: 8.2,
    country: 'Spain',
    countryFa: 'اسپانیا',
    synopsis:
      'A planner called the Professor gathers eight strangers and one very long plan inside the Royal Mint.',
    synopsisFa:
      'مغزی که او را استاد صدا می‌زنند هشت غریبه و یک نقشه‌ی بسیار طولانی را داخل ضراب‌خانه‌ی سلطنتی جمع می‌کند.',
    color: '#F59E0B',
    icon: 'cash-outline',
    seasons: [season('sr6', 1, 13, 45), season('sr6', 2, 9, 48)],
  },
];

export function seriesTitle(item: Series, lang: 'en' | 'fa'): string {
  return lang === 'fa' ? item.titleFa : item.title;
    }
                                               
