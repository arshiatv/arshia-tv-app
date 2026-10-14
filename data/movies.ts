// Demo film catalogue for the Movies tab.
//
// Posters are drawn from the theme palette and an icon rather than remote artwork, so
// nothing here depends on an image host that may disappear. `streamUrl` is intentionally
// empty: attach a real source per title when the film library is connected, and the
// player picks it up with no other change.

export interface Movie {
  id: string;
  title: string;
  year: number;
  genre: string;
  rating: number;
  duration: number;
  language: string;
  synopsis: string;
  color: string;
  icon: string;
  streamUrl: string;
}

export const MOVIES: Movie[] = [
  {
    id: 'm1',
    title: 'The Salesman',
    year: 2016,
    genre: 'Drama',
    rating: 7.8,
    duration: 124,
    language: 'Persian',
    synopsis:
      "A Tehran couple move into a new flat after their building nearly collapses, and a single violent night at the door pulls their marriage apart.",
    color: '#E63946',
    icon: 'videocam-outline',
    streamUrl: '',
  },
  {
    id: 'm2',
    title: 'A Separation',
    year: 2011,
    genre: 'Drama',
    rating: 8.3,
    duration: 123,
    language: 'Persian',
    synopsis:
      'A wife wants to leave Iran, her husband will not abandon his ailing father, and one decision drags two families into a courtroom.',
    color: '#1D3557',
    icon: 'people-outline',
    streamUrl: '',
  },
  {
    id: 'm3',
    title: 'Children of Heaven',
    year: 1997,
    genre: 'Family',
    rating: 8.2,
    duration: 89,
    language: 'Persian',
    synopsis:
      'A boy loses his sister shoes and the two children share one pair in secret, until a school race offers an unlikely prize.',
    color: '#22C55E',
    icon: 'walk-outline',
    streamUrl: '',
  },
  {
    id: 'm4',
    title: 'Taste of Cherry',
    year: 1997,
    genre: 'Drama',
    rating: 7.7,
    duration: 95,
    language: 'Persian',
    synopsis:
      'A man drives the dusty roads outside Tehran looking for someone willing to do one small job for him at sunrise.',
    color: '#F59E0B',
    icon: 'car-outline',
    streamUrl: '',
  },
  {
    id: 'm5',
    title: 'About Elly',
    year: 2009,
    genre: 'Mystery',
    rating: 8.0,
    duration: 119,
    language: 'Persian',
    synopsis:
      'A weekend at the Caspian Sea turns into a search party when a young teacher vanishes from the shore.',
    color: '#0EA5E9',
    icon: 'water-outline',
    streamUrl: '',
  },
  {
    id: 'm6',
    title: 'The Wind Will Carry Us',
    year: 1999,
    genre: 'Drama',
    rating: 7.4,
    duration: 118,
    language: 'Persian',
    synopsis:
      'A television crew waits in a remote Kurdish village for a funeral that will not come, and the wait changes the man sent to film it.',
    color: '#8B5CF6',
    icon: 'leaf-outline',
    streamUrl: '',
  },
  {
    id: 'm7',
    title: "Where Is the Friend's Home?",
    year: 1987,
    genre: 'Family',
    rating: 8.1,
    duration: 83,
    language: 'Persian',
    synopsis:
      'A schoolboy realises he has taken his classmate notebook home and sets off across the hills to return it before the morning.',
    color: '#F472B6',
    icon: 'school-outline',
    streamUrl: '',
  },
  {
    id: 'm8',
    title: 'The Cow',
    year: 1969,
    genre: 'Drama',
    rating: 7.9,
    duration: 100,
    language: 'Persian',
    synopsis:
      'When the only cow in a poor village dies, its owner is told she has wandered off, and grief slowly takes the place of the animal.',
    color: '#14B8A6',
    icon: 'moon-outline',
    streamUrl: '',
  },
  {
    id: 'm9',
    title: 'Inception',
    year: 2010,
    genre: 'Sci-Fi',
    rating: 8.8,
    duration: 148,
    language: 'English',
    synopsis:
      'A thief who steals secrets from dreams is offered one last job: plant an idea in a mind that has been trained to resist.',
    color: '#3B82F6',
    icon: 'planet-outline',
    streamUrl: '',
  },
  {
    id: 'm10',
    title: 'Interstellar',
    year: 2014,
    genre: 'Sci-Fi',
    rating: 8.7,
    duration: 169,
    language: 'English',
    synopsis:
      'With Earth failing, a former pilot flies through a wormhole to look for a world that can still hold a human future.',
    color: '#EC4899',
    icon: 'rocket-outline',
    streamUrl: '',
  },
  {
    id: 'm11',
    title: 'Parasite',
    year: 2019,
    genre: 'Thriller',
    rating: 8.5,
    duration: 132,
    language: 'Korean',
    synopsis:
      'A struggling family talks its way into the household of the wealthy Park family, one small lie at a time.',
    color: '#A855F7',
    icon: 'home-outline',
    streamUrl: '',
  },
  {
    id: 'm12',
    title: 'Dune',
    year: 2021,
    genre: 'Adventure',
    rating: 8.0,
    duration: 155,
    language: 'English',
    synopsis:
      'The heir of a noble house is handed a desert planet worth more than any empire, and every rival knows it.',
    color: '#FB923C',
    icon: 'sunny-outline',
    streamUrl: '',
  },
  {
    id: 'm13',
    title: 'The Dark Knight',
    year: 2008,
    genre: 'Action',
    rating: 9.0,
    duration: 152,
    language: 'English',
    synopsis:
      'A masked criminal with no plan but chaos forces a city, its prosecutors and its vigilante to choose what they are willing to become.',
    color: '#6C7A90',
    icon: 'flash-outline',
    streamUrl: '',
  },
  {
    id: 'm14',
    title: 'Close-Up',
    year: 1990,
    genre: 'Drama',
    rating: 8.3,
    duration: 98,
    language: 'Persian',
    synopsis:
      'A man who pretended to be a famous filmmaker stands trial, and the camera stays with him while he explains why.',
    color: '#EAB308',
    icon: 'film-outline',
    streamUrl: '',
  },
];

export const GENRES: string[] = Array.from(new Set(MOVIES.map((movie) => movie.genre))).sort();
export const LANGUAGES: string[] = Array.from(new Set(MOVIES.map((movie) => movie.language))).sort();
export const YEARS: number[] = Array.from(new Set(MOVIES.map((movie) => movie.year))).sort(
  (a, b) => b - a
);
    
