// Live channel playlist loader for Arshia TV.
// Loads ALL public sources (Iran/Persian first in merge order) so folders stay full.
// Fast first paint under VPN/slow networks, then continues loading every source so
// no channel category is ever dropped.

import { Channel, SAMPLE_CHANNELS, groupKeyFor } from '../data/channels';

// Critical Iran/Persian sources first — appear first after merge.
const PRIORITY_URLS = [
  'https://iptv-org.github.io/iptv/countries/ir.m3u',
  'https://iptv-org.github.io/iptv/languages/fas.m3u',
  'https://iptv-org.github.io/iptv/languages/prs.m3u',
  'https://raw.githubusercontent.com/shayanline/iptv-iran/main/playlists/iran.m3u',
  'https://raw.githubusercontent.com/shayanline/iptv-iran/main/playlists/categories/sat-movies.m3u',
  'https://raw.githubusercontent.com/shayanline/iptv-iran/main/playlists/categories/sat-general.m3u',
  'https://raw.githubusercontent.com/shayanline/iptv-iran/main/playlists/categories/irib-national.m3u',
  'https://raw.githubusercontent.com/shayanline/iptv-iran/main/playlists/categories/irib-provincial.m3u',
  'https://raw.githubusercontent.com/shayanline/iptv-iran/main/playlists/categories/irib-international.m3u',
];

// Full category catalogue — every shelf the app exposes.
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
  'https://iptv-org.github.io/iptv/categories/general.m3u',
];

const ALL_URLS = [...PRIORITY_URLS, ...EXTRA_URLS];

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

async function fetchText(url: string, timeoutMs = 9000): Promise<string> {
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

function mergeChannels(texts: string[]): Channel[] {
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

  return merged;
}

function mergeInto(base: Channel[], more: Channel[]): Channel[] {
  if (!more.length) return base;
  const seen = new Set(base.map((c) => `${c.name.toLowerCase()}|${c.group}`));
  const out = base.slice();
  for (const ch of more) {
    const key = `${ch.name.toLowerCase()}|${ch.group}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(ch);
  }
  return out;
}

let cache: Channel[] | null = null;
let fullLoadPromise: Promise<Channel[]> | null = null;

export interface ChannelResult {
  channels: Channel[];
  isOffline: boolean;
}

/**
 * Loads every playlist.
 *
 * - Priority (Iran/Persian) sources resolve first so the Live page paints quickly.
 * - All remaining category playlists continue in the background and are merged into
 *   the shared cache — no shelf is dropped.
 * - Hard overall budget so the spinner never stays forever under VPN.
 * - Offline fallback only when absolutely nothing arrives.
 */
export async function loadChannels(force: boolean = false): Promise<ChannelResult> {
  if (cache && !force) {
    return { channels: cache, isOffline: false };
  }

  if (force) {
    cache = null;
    fullLoadPromise = null;
  }

  const FIRST_PAINT_MS = 9000;

  try {
    // Kick off the full catalogue load once (shared across pages).
    if (!fullLoadPromise) {
      fullLoadPromise = (async () => {
        const texts = await Promise.all(ALL_URLS.map((u) => fetchText(u, 10000)));
        const full = mergeChannels(texts);
        if (full.length) {
          cache = full;
        }
        return full;
      })().catch(() => [] as Channel[]);
    }

    // Race: return as soon as we have useful data OR the first-paint budget ends.
    const firstPaint = new Promise<Channel[]>((resolve) => {
      setTimeout(() => resolve(cache || []), FIRST_PAINT_MS);
    });

    // Also try to get priority results early for a richer first paint.
    const priorityEarly = Promise.all(PRIORITY_URLS.map((u) => fetchText(u, 7000)))
      .then((texts) => {
        const early = mergeChannels(texts);
        if (early.length && (!cache || cache.length < early.length)) {
          cache = mergeInto(cache || [], early);
        }
        return early;
      })
      .catch(() => [] as Channel[]);

    await Promise.race([fullLoadPromise, priorityEarly, firstPaint]);

    // Prefer whatever is already in cache (may already include priority + partial full).
    let result = cache && cache.length ? cache : await priorityEarly;

    // If still empty, wait a bit more for the full load (total ~12s max).
    if (!result.length) {
      const late = await Promise.race([
        fullLoadPromise,
        new Promise<Channel[]>((resolve) => setTimeout(() => resolve([]), 3000)),
      ]);
      result = late;
    }

    if (!result.length) {
      return { channels: SAMPLE_CHANNELS, isOffline: true };
    }

    cache = result;
    return { channels: result, isOffline: false };
  } catch {
    return { channels: cache && cache.length ? cache : SAMPLE_CHANNELS, isOffline: true };
  }
}

/** Optional: wait until the background full catalogue is ready (used by refresh). */
export async function waitForFullCatalogue(maxMs = 15000): Promise<Channel[]> {
  if (cache && cache.length > 200) return cache;
  if (!fullLoadPromise) {
    await loadChannels(false);
  }
  if (!fullLoadPromise) return cache || SAMPLE_CHANNELS;
  const done = await Promise.race([
    fullLoadPromise,
    new Promise<Channel[]>((resolve) => setTimeout(() => resolve(cache || []), maxMs)),
  ]);
  return done.length ? done : cache || SAMPLE_CHANNELS;
}
