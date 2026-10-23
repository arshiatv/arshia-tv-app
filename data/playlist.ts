// Live channel playlist loader for Arshia TV.
// Two-phase load: fast first paint (Iran/Persian) + full catalogue in background.
// Nothing is dropped — every source is merged into the same cache.

import { Channel, SAMPLE_CHANNELS, groupKeyFor, refineGroupByName } from '../data/channels';

/** Phase 1 — priority sources (Iran / Persian / IRIB / satellite). Fast first paint. */
const PRIORITY_URLS = [
  'https://iptv-org.github.io/iptv/countries/ir.m3u',
  'https://iptv-org.github.io/iptv/languages/fas.m3u',
  'https://raw.githubusercontent.com/shayanline/iptv-iran/main/playlists/iran.m3u',
  'https://raw.githubusercontent.com/shayanline/iptv-iran/main/playlists/categories/sat-movies.m3u',
  'https://raw.githubusercontent.com/shayanline/iptv-iran/main/playlists/categories/sat-general.m3u',
  'https://raw.githubusercontent.com/shayanline/iptv-iran/main/playlists/categories/irib-national.m3u',
  'https://raw.githubusercontent.com/shayanline/iptv-iran/main/playlists/categories/irib-provincial.m3u',
  'https://raw.githubusercontent.com/shayanline/iptv-iran/main/playlists/categories/irib-international.m3u',
];

/** Phase 2 — full category catalogue. Loaded in background and merged (never replaces priority). */
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
        group: refineGroupByName(pending.group, pending.name),
        logo: pending.logo,
        quality: pending.quality,
        url: line,
      });
    }
    pending = null;
  }

  return channels;
}

function mergeFromTexts(texts: string[]): Channel[] {
  // First occurrence wins for primary url; later distinct urls become backupUrls
  // so the player can auto-failover (GEM and similar often publish several mirrors).
  const byKey = new Map<string, Channel>();
  texts.forEach((raw) => {
    const list = parsePlaylist(raw);
    if (!list.length) return;
    list.sort((a, b) => a.name.localeCompare(b.name));
    for (const channel of list) {
      const key = `${channel.name.toLowerCase()}|${channel.group}`;
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, { ...channel, backupUrls: channel.backupUrls ? [...channel.backupUrls] : [] });
        continue;
      }
      const url = (channel.url || '').trim();
      if (!url) continue;
      if (url === existing.url) continue;
      const backups = existing.backupUrls || [];
      if (!backups.includes(url) && backups.length < 6) {
        existing.backupUrls = [...backups, url];
      }
    }
  });
  return Array.from(byKey.values());
}

/** Merge `more` into `base` without dropping any existing channel. */
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
let phase2Promise: Promise<Channel[]> | null = null;

export interface ChannelResult {
  channels: Channel[];
  isOffline: boolean;
}

/**
 * Two-phase catalogue load.
 *
 * Phase 1 (this call returns): PRIORITY_URLS only — fast, hang-capped (~7s).
 * Phase 2 (background): EXTRA_URLS + full merge into the same cache — all channels.
 *
 * Pull-to-refresh (force=true) restarts both phases.
 * SAMPLE_CHANNELS only if phase 1 returns absolutely nothing.
 */
export async function loadChannels(force: boolean = false): Promise<ChannelResult> {
  if (cache && cache.length && !force) {
    return { channels: cache, isOffline: false };
  }

  if (force) {
    cache = null;
    phase2Promise = null;
  }

  const PHASE1_HARD_MS = 7000;
  const PER_URL_MS = 7000;

  try {
    // ----- Phase 1: priority only -----
    const phase1Work = Promise.all(
      PRIORITY_URLS.map((u) => fetchText(u, PER_URL_MS))
    ).then((texts) => mergeFromTexts(texts));

    const phase1 = await Promise.race([
      phase1Work,
      new Promise<Channel[]>((resolve) => setTimeout(() => resolve([]), PHASE1_HARD_MS)),
    ]);

    // If deadline hit empty, give phase1 a short grace (often almost done)
    let first = phase1;
    if (!first.length) {
      first = await Promise.race([
        phase1Work,
        new Promise<Channel[]>((resolve) => setTimeout(() => resolve([]), 2000)),
      ]);
    }

    if (first.length) {
      cache = mergeInto(cache || [], first);
    }

    // ----- Phase 2: full catalogue in background (never blocks UI) -----
    if (!phase2Promise) {
      phase2Promise = (async () => {
        // Wait for remaining phase1 bytes if still in flight, then all extras
        const [p1texts, extraTexts] = await Promise.all([
          Promise.all(PRIORITY_URLS.map((u) => fetchText(u, PER_URL_MS))),
          Promise.all(EXTRA_URLS.map((u) => fetchText(u, 8000))),
        ]);
        const full = mergeFromTexts([...p1texts, ...extraTexts]);
        if (full.length) {
          cache = full; // full is a strict superset after mergeFromTexts over all sources
        }
        return cache || full;
      })().catch(() => cache || []);
    }

    if (!cache || !cache.length) {
      return { channels: SAMPLE_CHANNELS, isOffline: true };
    }

    return { channels: cache, isOffline: false };
  } catch {
    return { channels: cache && cache.length ? cache : SAMPLE_CHANNELS, isOffline: !cache };
  }
}

/**
 * Wait until phase 2 has expanded the catalogue (or timeout).
 * Live page calls this after first paint so folders fill without a second spinner.
 */
export async function waitForFullCatalogue(maxMs = 18000): Promise<Channel[]> {
  if (cache && cache.length > 300) return cache;

  if (!phase2Promise) {
    // Kick load if nothing started yet
    await loadChannels(false);
  }

  if (phase2Promise) {
    const done = await Promise.race([
      phase2Promise,
      new Promise<Channel[]>((resolve) => setTimeout(() => resolve(cache || []), maxMs)),
    ]);
    if (done && done.length) return done;
  }

  return cache && cache.length ? cache : SAMPLE_CHANNELS;
}

/** Total source count (for diagnostics). */
export const PLAYLIST_SOURCE_COUNT = ALL_URLS.length;
