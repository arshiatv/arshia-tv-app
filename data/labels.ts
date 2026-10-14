// Persian names for the catalogue vocabulary.
//
// Channel folders, film genres and film titles are stored in English in the catalogue, so
// the Persian side of each one lives here and every screen reads it through the small
// helpers below. Titles that have no Persian entry fall back to the stored name.

import type { Lang } from '../locales';

export const GROUP_LABELS_FA: Record<string, string> = {
  General: 'عمومی',
  Sports: 'ورزشی',
  Snooker: 'اسنوکر و بیلیارد',
  Kids: 'کودک',
  Movies: 'فیلم',
  Series: 'سریال',
  News: 'خبری',
  Entertainment: 'سرگرمی',
  Culture: 'مستند',
  Religious: 'مذهبی',
  Music: 'موسیقی',
  Lifestyle: 'سبک زندگی',
  Family: 'خانوادگی',
  Other: 'سایر',
};

export const GENRE_FA: Record<string, string> = {
  Drama: 'درام',
  Family: 'خانوادگی',
  Mystery: 'معمایی',
  'Sci-Fi': 'علمی‌تخیلی',
  Thriller: 'دلهره‌آور',
  Adventure: 'ماجراجویی',
  Action: 'اکشن',
};

export const LANGUAGE_FA: Record<string, string> = {
  Persian: 'فارسی',
  English: 'انگلیسی',
  Korean: 'کره‌ای',
};

export const MOVIE_TITLES_FA: Record<string, string> = {
  m1: 'فروشنده',
  m2: 'جدایی نادر از سیمین',
  m3: 'بچه‌های آسمان',
  m4: 'طعم گیلاس',
  m5: 'درباره الی',
  m6: 'باد ما را خواهد برد',
  m7: 'خانه‌ی دوست کجاست؟',
  m8: 'گاو',
  m9: 'تلقین',
  m10: 'میان‌ستاره‌ای',
  m11: 'انگل',
  m12: 'تل ماسه',
  m13: 'شوالیه تاریکی',
  m14: 'نمای نزدیک',
};

export const SYNOPSIS_FA: Record<string, string> = {
  m1: 'زوجی که در نمایش «مرگ فروشنده» بازی می‌کنند، شب حادثه‌ای در خانه‌ی تازه‌شان همه‌چیز را زیر و رو می‌کند.',
  m2: 'زنی در آستانه‌ی مهاجرت می‌ماند یا می‌رود، و همین تصمیم، خانواده و دو رابطه را به لبه‌ی فروپاشی می‌برد.',
  m3: 'پسری کفش خواهرش را گم می‌کند و برای اینکه کسی نفهمد، دو کودک با هم پنهان‌کاری می‌کنند.',
  m4: 'مردی که می‌خواهد به زندگی خود پایان دهد، در جاده‌ی بیرون شهر دنبال کسی می‌گردد که او را خاک کند.',
  m5: 'یک سفر ساحلی و ناپدید شدن ناگهانی یک کودک، دروغ‌ها و ترس‌های جمعی را بیرون می‌ریزد.',
  m6: 'فیلمسازی برای مراسمی به روستایی دور می‌رود و در آنجا با انتظار و مرگ روبه‌رو می‌شود.',
  m7: 'پسری دفتر مشق دوستش را برمی‌گرداند و برای همین راهی روستای همسایه می‌شود.',
  m8: 'مردی در روستایی فقیر گاوی را که تنها دارایی‌اش است از دست می‌دهد و کم‌کم جای گاو می‌نشیند.',
  m9: 'دزدی حرفه‌ای با تیمی از خواب‌های مردم راز می‌دزدد و برای آخرین کار باید ایده‌ای را بکارد.',
  m10: 'خلبانی برای نجات زمین از میان کرم‌چاله‌ای می‌گذرد و در سیاره‌ای دیگر زمان را از دست می‌دهد.',
  m11: 'خانواده‌ای تنگ‌دست یکی‌یکی به خانه‌ی ثروتمندان راه پیدا می‌کنند تا اینکه رازی بیرون می‌زند.',
  m12: 'وارثی جوان به سیاره‌ای بیابانی می‌رود تا آینده‌ی خانواده و ادویه‌ی گران‌بها را تعیین کند.',
  m13: 'بتمن و جیمز گوردون با هرج‌ومرجی روبه‌رو می‌شوند که می‌خواهد شهر را به انتخاب بین دو بدی بکشاند.',
  m14: 'مردی که فیلمساز شده، در دادگاه از کسی می‌گوید که او را با سینما آشنا کرد.',
};

export function synopsis(id: string, text: string, lang: Lang): string {
  if (lang !== 'fa') return text;
  return SYNOPSIS_FA[id] || text;
}

export function groupLabel(key: string, lang: Lang, fallback: string): string {
  if (lang !== 'fa') return fallback;
  return GROUP_LABELS_FA[key] || fallback;
}

export function genreLabel(genre: string, lang: Lang): string {
  if (lang !== 'fa') return genre;
  return GENRE_FA[genre] || genre;
}

export function languageLabel(language: string, lang: Lang): string {
  if (lang !== 'fa') return language;
  return LANGUAGE_FA[language] || language;
}

export function movieTitle(id: string, title: string, lang: Lang): string {
  if (lang !== 'fa') return title;
  return MOVIE_TITLES_FA[id] || title;
  }
                              
