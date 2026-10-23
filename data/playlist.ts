// Live channel playlist loader for Arshia TV.
// Loads ALL public sources (Iran/Persian first in merge order) so folders stay full.

import { Channel, SAMPLE_CHANNELS, groupKeyFor } from '../data/channels';

const PLAYLIST_URLS = [
  // Iran + Persian — first (appear first after merge)
  'https://iptv-org.github.io/iptv/countries/ir.m3u',
  'https://iptv-org.github.io/iptv/languages/fas.m3u',
  'https://iptv-org.github.io/iptv/languages/prs.m3u',
  'https://raw.githubusercontent.com/shayanline/iptv-iran/main/playlists/iran.m3u',
  'https://raw.githubusercontent.com/shayanline/iptv-iran/main/playlists/categories/sat-movies.m3u',
  'https://raw.githubusercontent.com/shayanline/iptv-iran/main/playlists/categories/sat-general.m3u',
  'https://raw.githubusercontent.com/shayanline/iptv-iran/main/playlists/categories/irib-national.m3u',
  'https://raw.githubusercontent.com/shayanline/iptv-iran/main/playlists/categories/irib-provincial.m3u',
  'https://raw.githubusercontent.com/shayanline/iptv-iran/main/playlists/categories/irib-international.m3u',
  // Categories — no artificial low cap
  'https://iptv-org.github.io/iptv/categories/sports.m3u',
  'https://iptv-org.github.io/iptv/categories/movies.m3u',
  'https://iptv-org.github.io/iptv/categories/series.m3u',
  'https://iptv-org.github.io/iptv/categories/kids.m3u',
  'https://iptv-org.github.io/iptv/categories/documentary.m3u',
  'https://iptv-org.github.io/iptv/categories/news.m3u',
  'https://iptv-org.github.io/iptv/categories/entertainment.m3u',
  'https://iptv-org.github.io/iptv/categories/music.m3u',
  'https://iptv-org.github.io/iptv/categories/animation.m3u',
  'https://iptv-org.github.io/iptv/categories/family.m3u',
  'https://iptv-org.github.io/iptv/categories/religious.m3u',
  'https://iptv-org.github.io/iptv/categories/cooking.m3u',
  'https://iptv-org.github.io/iptv/categories/culture.m3u',
  'https://iptv-org.github.io/iptv/categories/comedy.m3u',
  'https://iptv-org.github.io/iptv/categories/classic.m3u',
  'https://iptv-org.github.io/iptv/categories/education.m3u',
  'https://iptv-org.github.io/iptv/categories/outdoor.m3u',
  'https://iptv-org.github.io/iptv/categories/auto.m3u',
  'https://iptv-org.github.io/iptv/categories/business.m3u',
  'https://iptv-org.github.io/iptv/categories/general.m3u',
];

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&lt;': '<',
  '&gt;': '>',
  '&nbsp;': ' ',
};

function decodeEntities(value: string): string {
  return value.replace(/&(amp|quot|#39|apos|lt|gt|nbsp);/g, (match) => ENTITIES[match] || match);
}

async function fetchText(url: string, timeoutMs = 12000): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: 'audio/x-mpegurl, application/vnd.apple.mpegurl, text/plain, */*' },
    });
    if (!res.ok) return '';
    return await res.text();
  } catch {
    return '';
  } finally {
    clearTimeout(timer);
  }
}

export function parsePlaylist(text: string): Channel[] {
  const lines = String(text || '').split(/\r?\n/);
  const channels: Channel[] = [];
  const seen = new Set<string>();
  let pending: { id: string; name: string; group: string; logo: string; quality: string } | null =
    null;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF')) {
      const attrs: Record<string, string> = {};
      const matcher = /([a-zA-Z0-9-]+)="([^"]*)"/g;
      let found = matcher.exec(line);
      while (found !== null) {
        attrs[found[1].toLowerCase()] = found[2];
        found = matcher.exec(line);
      }

      const rawName = decodeEntities(line.slice(line.lastIndexOf(',') + 1).trim());
      const quality = rawName.match(/\((\d{3,4}p)\)\s*$/i);
      const name = rawName.replace(/\s*\(\d{3,4}p\)\s*$/i, '').trim();
      if (!name) {
        pending = null;
        continue;
      }

      const group = groupKeyFor(attrs['group-title'] || '');
      pending = {
        id: attrs['tvg-id'] || name,
        name,
        group: group === 'Sports' && /snooker|billiard/i.test(name) ? 'Snooker' : group,
        logo: attrs['tvg-logo'] || '',
        quality: quality ? quality[1] : '',
      };
      continue;
    }

    if (line.startsWith('#')) continue;
    if (!pending) continue;
    const key = `${pending.id}|${line}`;
    if (!seen.has(key)) {
      seen.add(key);
      channels.push({
        id: key,
        name: pending.name,
        group: pending.group,
        logo: pending.logo,
        quality: pending.quality,
        url: line,
      });
    }
    pending = null;
  }

  return channels;
}

let cache: Channel[] | null = null;

export interface ChannelResult {
  channels: Channel[];
  isOffline: boolean;
}

/**
 * Loads every playlist in parallel and merges unique channels.
 * No half-list / progressive drop — full catalogue every time.
 */
export async function loadChannels(force: boolean = false): Promise<ChannelResult> {
  if (cache && !force) {
    return { channels: cache, isOffline: false };
  }

  try {
    const texts = await Promise.all(PLAYLIST_URLS.map((u) => fetchText(u, 14000)));
    const merged: Channel[] = [];
    const seen = new Set<string>();

    texts.forEach((raw) => {
      const list = parsePlaylist(raw);
      if (!list.length) return;
      list.sort((a, b) => a.name.localeCompare(b.name));
      for (const channel of list) {
        const key = `${channel.name.toLowerCase()}|${channel.group}`;
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(channel);
      }
    });

    if (!merged.length) throw new Error('empty playlist');
    cache = merged;
    return { channels: merged, isOffline: false };
  } catch {
    return { channels: SAMPLE_CHANNELS, isOffline: true };
  }
}
