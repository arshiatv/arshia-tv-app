// Persian-language satellite networks.
//
// Nothing is invented here: each network below is only a name, a colour and the words its
// channels carry in their title. The channels themselves — and their stream addresses —
// come from the same public playlists the Live TV page uses, so this shelf can never show
// a button that leads to a made-up address.

import type { Channel } from './channels';
import type { Lang } from '../locales';

export interface Network {
  key: string;
  label: string;
  labelFa: string;
  color: string;
  icon: string;
  match: string[];
}

export const NETWORKS: Network[] = [
  {
    key: 'gem',
    label: 'GEM TV',
    labelFa: 'جِم تی‌وی',
    color: '#E63946',
    icon: 'sparkles-outline',
    match: ['gem '],
  },
  {
    key: 'manoto',
    label: 'Manoto',
    labelFa: 'منوتو',
    color: '#EC4899',
    icon: 'musical-notes-outline',
    match: ['manoto'],
  },
  {
    key: 'bbc',
    label: 'BBC Persian',
    labelFa: 'بی‌بی‌سی فارسی',
    color: '#3B82F6',
    icon: 'newspaper-outline',
    match: ['bbc persian', 'bbc farsi'],
  },
  {
    key: 'voa',
    label: 'VOA Persian',
    labelFa: 'صدای آمریکا',
    color: '#0EA5E9',
    icon: 'radio-outline',
    match: ['voa'],
  },
  {
    key: 'iranintl',
    label: 'Iran International',
    labelFa: 'ایران اینترنشنال',
    color: '#8B5CF6',
    icon: 'globe-outline',
    match: ['iran international'],
  },
  {
    key: 'irib',
    label: 'IRIB',
    labelFa: 'صدا و سیما',
    color: '#22C55E',
    icon: 'tv-outline',
    match: ['irib'],
  },
  {
    key: 'ifilm',
    label: 'iFilm',
    labelFa: 'آی‌فیلم',
    color: '#F59E0B',
    icon: 'film-outline',
    match: ['ifilm'],
  },
  {
    key: 'press',
    label: 'Press TV',
    labelFa: 'پرس تی‌وی',
    color: '#14B8A6',
    icon: 'mic-outline',
    match: ['press tv'],
  },
  {
    key: 'alam',
    label: 'Al-Alam',
    labelFa: 'العالم',
    color: '#A855F7',
    icon: 'earth-outline',
    match: ['al-alam', 'alalam'],
  },
  {
    key: 'pmc',
    label: 'PMC',
    labelFa: 'پی‌ام‌سی',
    color: '#FB923C',
    icon: 'headset-outline',
    match: ['pmc'],
  },
];

export function networkLabel(network: Network, lang: Lang): string {
  return lang === 'fa' ? network.labelFa : network.label;
}

/** The first network whose name appears in the channel title, if any. */
export function networkFor(channel: Channel): Network | null {
  const name = (channel.name || '').toLowerCase();
  const group = (channel.group || '').toLowerCase();
  return (
    NETWORKS.find((network) =>
      network.match.some((needle) => name.includes(needle) || group.includes(needle))
    ) || null
  );
    }
    
