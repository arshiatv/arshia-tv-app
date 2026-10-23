/**
 * Arshia TV — Production playlist loader
 *
 * Design goals (non-negotiable):
 *  1. ZERO channels dropped. Every unique stream from every source is kept.
 *  2. Fast first paint: priority Iran/Persian/IRIB sources only (hard deadline ~6s).
 *  3. Full catalogue expands in background; UI never waits for it.
 *  4. Automatic failover: multiple mirrors per logical source; per-URL timeout.
 *  5. Professional merge: same name+url = same channel; extra urls become backupUrls.
 *  6. App never hangs: network work is bounded; cache is shared; no giant sync loops.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Channel, SAMPLE_CHANNELS, groupKeyFor, refineGroupByName } from './channels';
import { EMBEDDED_CHANNELS } from './embeddedChannels';

/** Strong local baseline: real Iran/Persian streams + sample names for empty shelves. */
const LOCAL_BASE: Channel[] = (() => {
  const map = new Map<string, Channel>();
  for (const ch of EMBEDDED_CHANNELS) map.set(ch.id, ch);
  for (const ch of SAMPLE_CHANNELS) {
    if (!map.has(ch.id)) map.set(ch.id, ch);
  }
  return Array.from(map.values());
})();

const STORAGE_KEY = 'arshia_tv_channel_cache_v2';

async function readPersisted(): Promise<Channel[] | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 50) return parsed as Channel[];
  } catch {
    /* ignore corrupt cache */
  }
  return null;
}

async function writePersisted(list: Channel[]): Promise<void> {
  if (!list || list.length < 50) return;
  try {
    // Keep payload reasonable — store essentials only
    const slim = list.map((c) => ({
      id: c.id,
      name: c.name,
      group: c.group,
      logo: c.logo || '',
      url: c.url,
      quality: c.quality || '',
      backupUrls: c.backupUrls && c.backupUrls.length ? c.backupUrls.slice(0, 4) : undefined,
    }));
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
  } catch {
    /* storage full — ignore */
  }
}


// ---------------------------------------------------------------------------
// Sources — priority first, then full category catalogue
// Multiple mirrors for critical sources so one dead CDN never empties a folder.
// ---------------------------------------------------------------------------

const PRIORITY_SOURCES: string[][] = [
  // Iran country feed
  [
    'https://iptv-org.github.io/iptv/countries/ir.m3u',
    'https://cdn.jsdelivr.net/gh/iptv-org/iptv@master/streams/ir.m3u',
  ],
  // Persian language
  [
    'https://iptv-org.github.io/iptv/languages/fas.m3u',
    'https://cdn.jsdelivr.net/gh/iptv-org/iptv@master/streams/fas.m3u',
  ],
  // Curated Iranian playlists (shayanline)
  ['https://raw.githubusercontent.com/shayanline/iptv-iran/main/playlists/iran.m3u'],
  ['https://raw.githubusercontent.com/shayanline/iptv-iran/main/playlists/categories/sat-movies.m3u'],
  ['https://raw.githubusercontent.com/shayanline/iptv-iran/main/playlists/categories/sat-general.m3u'],
  ['https://raw.githubusercontent.com/shayanline/iptv-iran/main/playlists/categories/irib-national.m3u'],
  ['https://raw.githubusercontent.com/shayanline/iptv-iran/main/playlists/categories/irib-provincial.m3u'],
  ['https://raw.githubusercontent.com/shayanline/iptv-iran/main/playlists/categories/irib-international.m3u'],
];

const EXTRA_SOURCES: string[][] = [
  ['https://iptv-org.github.io/iptv/categories/sports.m3u'],
  ['https://iptv-org.github.io/iptv/categories/movies.m3u'],
  ['https://iptv-org.github.io/iptv/categories/series.m3u'],
  ['https://iptv-org.github.io/iptv/categories/kids.m3u'],
  ['https://iptv-org.github.io/iptv/categories/documentary.m3u'],
  ['https://iptv-org.github.io/iptv/categories/news.m3u'],
  ['https://iptv-org.github.io/iptv/categories/entertainment.m3u'],
  ['https://iptv-org.github.io/iptv/categories/music.m3u'],
  ['https://iptv-org.github.io/iptv/categories/animation.m3u'],
  ['https://iptv-org.github.io/iptv/categories/family.m3u'],
  ['https://iptv-org.github.io/iptv/categories/religious.m3u'],
  ['https://iptv-org.github.io/iptv/categories/cooking.m3u'],
  ['https://iptv-org.github.io/iptv/categories/culture.m3u'],
  ['https://iptv-org.github.io/iptv/categories/comedy.m3u'],
  ['https://iptv-org.github.io/iptv/categories/classic.m3u'],
  ['https://iptv-org.github.io/iptv/categories/education.m3u'],
  ['https://iptv-org.github.io/iptv/categories/outdoor.m3u'],
  ['https://iptv-org.github.io/iptv/categories/auto.m3u'],
  ['https://iptv-org.github.io/iptv/categories/business.m3u'],
  ['https://iptv-org.github.io/iptv/categories/general.m3u'],
  // Additional high-value shelves
  ['https://iptv-org.github.io/iptv/categories/science.m3u'],
  ['https://iptv-org.github.io/iptv/categories/travel.m3u'],
  ['https://iptv-org.github.io/iptv/categories/weather.m3u'],
];

const ALL_SOURCE_COUNT =
  PRIORITY_SOURCES.reduce((n, m) => n + m.length, 0) +
  EXTRA_SOURCES.reduce((n, m) => n + m.length, 0);

// ---------------------------------------------------------------------------
// Network helpers — bounded, abortable, automatic mirror failover
// ---------------------------------------------------------------------------

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
  return value.replace(/&(amp|quot|#39|apos|lt|gt|nbsp);/g, (m) => ENTITIES[m] || m);
}

async function fetchText(url: string, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
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

/** Try mirrors in order; return first non-empty body. */
async function fetchFirstMirror(mirrors: string[], timeoutMs: number): Promise<string> {
  for (const url of mirrors) {
    const body = await fetchText(url, timeoutMs);
    if (body && body.length > 32) return body;
  }
  return '';
}

// ---------------------------------------------------------------------------
// M3U parser — never drops a valid entry
// ---------------------------------------------------------------------------

function parseM3U(text: string): Channel[] {
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  const out: Channel[] = [];
  let pending: {
    name: string;
    group: string;
    logo: string;
    quality: string;
  } | null = null;

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
      const qualityMatch = rawName.match(/\((\d{3,4}p)\)\s*$/i);
      const name = rawName.replace(/\s*\(\d{3,4}p\)\s*$/i, '').trim();
      if (!name) {
        pending = null;
        continue;
      }

      const rawGroup = attrs['group-title'] || attrs['group'] || '';
      const logo = attrs['tvg-logo'] || attrs['logo'] || '';
      const quality = qualityMatch ? qualityMatch[1] : attrs['tvg-quality'] || '';

      let group = groupKeyFor(rawGroup);
      group = refineGroupByName(group, name);

      pending = { name, group, logo, quality };
      continue;
    }

    if (line.startsWith('#')) continue;

    // Stream URL line
    if (pending && (line.startsWith('http://') || line.startsWith('https://') || line.startsWith('rtmp'))) {
      const id = (pending.name + '|' + line).toLowerCase().replace(/\s+/g, ' ');
      out.push({
        id,
        name: pending.name,
        group: pending.group,
        logo: pending.logo,
        url: line,
        quality: pending.quality,
      });
      pending = null;
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// Merge — zero drops. Same name+url is identity; extra urls become backups.
// ---------------------------------------------------------------------------

function mergeInto(base: Channel[], more: Channel[]): Channel[] {
  if (!more.length) return base;
  const map = new Map<string, Channel>();

  for (const ch of base) {
    map.set(ch.id, { ...ch, backupUrls: ch.backupUrls ? [...ch.backupUrls] : [] });
  }

  for (const ch of more) {
    const existing = map.get(ch.id);
    if (!existing) {
      map.set(ch.id, { ...ch, backupUrls: ch.backupUrls ? [...ch.backupUrls] : [] });
      continue;
    }
    // Same identity — harvest any extra useful fields
    if (!existing.logo && ch.logo) existing.logo = ch.logo;
    if (!existing.quality && ch.quality) existing.quality = ch.quality;
    // If URLs differ (should not happen for same id), keep as backup
    if (ch.url && ch.url !== existing.url) {
      const backups = existing.backupUrls || [];
      if (!backups.includes(ch.url)) backups.push(ch.url);
      existing.backupUrls = backups;
    }
    if (ch.backupUrls && ch.backupUrls.length) {
      const backups = existing.backupUrls || [];
      for (const u of ch.backupUrls) {
        if (u && u !== existing.url && !backups.includes(u)) backups.push(u);
      }
      existing.backupUrls = backups;
    }
  }

  return Array.from(map.values());
}

function mergeFromTexts(texts: string[]): Channel[] {
  let acc: Channel[] = [];
  for (const t of texts) {
    if (!t) continue;
    acc = mergeInto(acc, parseM3U(t));
  }
  return acc;
}

// ---------------------------------------------------------------------------
// Cache + phase control
// ---------------------------------------------------------------------------

let cache: Channel[] | null = null;
let phase2Promise: Promise<Channel[]> | null = null;

async function loadSourceGroup(
  groups: string[][],
  perUrlMs: number
): Promise<Channel[]> {
  const texts = await Promise.all(groups.map((mirrors) => fetchFirstMirror(mirrors, perUrlMs)));
  return mergeFromTexts(texts);
}

/**
 * Primary entry. Returns as soon as phase-1 has something (or SAMPLE).
 * Full catalogue continues in background.
 */
export async function loadChannels(force = false): Promise<{
  channels: Channel[];
  isOffline: boolean;
}> {
  if (!force && cache && cache.length) {
    return { channels: cache, isOffline: false };
  }

  if (force) {
    cache = null;
    phase2Promise = null;
    try {
      // Soft refresh keeps storage; hard double-pull could clear — keep storage for speed
      // await AsyncStorage.removeItem(STORAGE_KEY);
    } catch { /* ignore */ }
  }

  // Instant baseline so UI never opens on an empty / tiny list
  if (!cache || !cache.length) {
    cache = LOCAL_BASE.slice();
  }

  // Restore last successful full catalogue (can be thousands of channels)
  if (!force) {
    const persisted = await readPersisted();
    if (persisted && persisted.length > (cache?.length || 0)) {
      cache = mergeInto(cache || [], persisted);
    }
  }

  const PHASE1_HARD_MS = 6500;
  const PER_URL_MS = 5500;

  try {
    const phase1Work = loadSourceGroup(PRIORITY_SOURCES, PER_URL_MS);

    const phase1 = await Promise.race([
      phase1Work,
      new Promise<Channel[]>((resolve) => setTimeout(() => resolve([]), PHASE1_HARD_MS)),
    ]);

    let first = phase1;
    if (!first.length) {
      // Short grace — often the network is just about to finish
      first = await Promise.race([
        phase1Work,
        new Promise<Channel[]>((resolve) => setTimeout(() => resolve([]), 1800)),
      ]);
    }

    if (first.length) {
      cache = mergeInto(cache || [], first);
      if (cache.length > 100) void writePersisted(cache);
    }

    // Kick phase 2 exactly once
    if (!phase2Promise) {
      phase2Promise = (async () => {
        try {
          const [priority, extras] = await Promise.all([
            loadSourceGroup(PRIORITY_SOURCES, PER_URL_MS),
            loadSourceGroup(EXTRA_SOURCES, 7500),
          ]);
          const full = mergeInto(priority, extras);
          if (full.length) {
            cache = mergeInto(cache || [], full);
            void writePersisted(cache);
          }
          return cache || full;
        } catch {
          return cache || [];
        }
      })();
    }

    if (!cache || !cache.length) {
      return { channels: LOCAL_BASE, isOffline: true };
    }

    return { channels: cache, isOffline: false };
  } catch {
    return {
      channels: cache && cache.length ? cache : LOCAL_BASE,
      isOffline: !cache,
    };
  }
}

/**
 * Wait for background expansion (or timeout). Live page calls this after first paint.
 */
export async function waitForFullCatalogue(maxMs = 20000): Promise<Channel[]> {
  if (cache && cache.length > 250) return cache;

  if (!phase2Promise) {
    await loadChannels(false);
  }

  if (phase2Promise) {
    const done = await Promise.race([
      phase2Promise,
      new Promise<Channel[]>((resolve) => setTimeout(() => resolve(cache || []), maxMs)),
    ]);
    if (done && done.length) return done;
  }

  return cache && cache.length ? cache : LOCAL_BASE;
}

/** Diagnostics */
export const PLAYLIST_SOURCE_COUNT = ALL_SOURCE_COUNT;

export function getCachedChannelCount(): number {
  return cache?.length ?? 0;
}
