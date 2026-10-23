// Live channel playlist loader for Arshia TV.
// Priority: Iran + Persian first (fast UI), then world shelves in background.

import { Channel, SAMPLE_CHANNELS, groupKeyFor } from '../data/channels';

/** Core Persian / Iran sources — loaded first, no cap. */
const PRIORITY_URLS = [
  'https://iptv-org.github.io/iptv/countries/ir.m3u',
  'https://iptv-org.github.io/iptv/languages/fas.m3u',
  'https://iptv-org.github.io/iptv/languages/prs.m3u', // Afghan Persian
  // Curated Iranian lists (IRIB, sat movies/series/news)
  'https://raw.githubusercontent.com/shayanline/iptv-iran/main/playlists/iran.m3u',
  'https://raw.githubusercontent.com/shayanline/iptv-iran/main/playlists/categories/sat-movies.m3u',
  'https://raw.githubusercontent.com/shayanline/iptv-iran/main/playlists/categories/sat-general.m3u',
  'https://raw.githubusercontent.com/shayanline/iptv-iran/main/playlists/categories/irib-national.m3u',
  'https://raw.githubusercontent.com/shayanline/iptv-iran/main/playlists/categories/irib-provincial.m3u',
];

/** Extra category shelves — capped so the phone list stays usable. */
const EXTRA_URLS = [
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
];

const EXTRA_PLAYLIST_CAP = 180;

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

async function fetchText(url: string, timeoutMs = 8000): Promise<string> {
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

/**
 * Turns an M3U/M3U8 playlist into channels.
 */
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

function mergeInto(
  target: Channel[],
  seen: Set<string>,
  list: Channel[],
  cap?: number
): void {
  let items = list;
  if (cap && items.length > cap) {
    items = items.slice(0, cap);
  }
  for (const channel of items) {
    const key = `${channel.name.toLowerCase()}|${channel.group}`;
    if (seen.has(key)) continue;
    seen.add(key);
    target.push(channel);
  }
}

let cache: Channel[] | null = null;
let loadingExtra = false;

export interface ChannelResult {
  channels: Channel[];
  isOffline: boolean;
}

/**
 * Fast path: priority Persian/Iran playlists first.
 * Extra world shelves merge in background and update cache.
 */
export async function loadChannels(force: boolean = false): Promise<ChannelResult> {
  if (cache && !force) {
    return { channels: cache, isOffline: false };
  }

  try {
    const priorityTexts = await Promise.all(PRIORITY_URLS.map((u) => fetchText(u, 7000)));
    const merged: Channel[] = [];
    const seen = new Set<string>();

    priorityTexts.forEach((raw) => {
      const list = parsePlaylist(raw);
      if (!list.length) return;
      list.sort((a, b) => a.name.localeCompare(b.name));
      mergeInto(merged, seen, list);
    });

    if (!merged.length) throw new Error('empty playlist');
    cache = merged;

    // Background: more categories without blocking first paint
    if (!loadingExtra) {
      loadingExtra = true;
      Promise.all(EXTRA_URLS.map((u) => fetchText(u, 9000)))
        .then((texts) => {
          const base = cache ? [...cache] : [];
          const seen2 = new Set(base.map((c) => `${c.name.toLowerCase()}|${c.group}`));
          texts.forEach((raw) => {
            let list = parsePlaylist(raw);
            if (!list.length) return;
            list.sort((a, b) => a.name.localeCompare(b.name));
            mergeInto(base, seen2, list, EXTRA_PLAYLIST_CAP);
          });
          cache = base;
        })
        .catch(() => {})
        .finally(() => {
          loadingExtra = false;
        });
    }

    return { channels: merged, isOffline: false };
  } catch {
    return { channels: SAMPLE_CHANNELS, isOffline: true };
  }
}
