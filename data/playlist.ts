/**
 * Arshia TV playlist — Iran/Persian first + useful shelves + Adult/Sex folder.
 * All user folders kept. Persian maximized. Wrestling & Nature boosted.
 * No world general dump.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Channel, SAMPLE_CHANNELS, groupKeyFor, refineGroupByName } from './channels';
import { EMBEDDED_CHANNELS } from './embeddedChannels';

const LOCAL_BASE: Channel[] = (() => {
  const map = new Map<string, Channel>();
  for (const ch of EMBEDDED_CHANNELS) map.set(ch.id, ch);
  for (const ch of SAMPLE_CHANNELS) {
    if (!map.has(ch.id)) map.set(ch.id, ch);
  }
  return Array.from(map.values());
})();

const STORAGE_KEY = 'arshia_tv_channel_cache_v4_fullfolders';

async function readPersisted(): Promise<Channel[] | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 30) return parsed as Channel[];
  } catch { /* ignore */ }
  return null;
}

async function writePersisted(list: Channel[]): Promise<void> {
  if (!list || list.length < 30) return;
  try {
    const slim = list.map((c) => ({
      id: c.id, name: c.name, group: c.group, logo: c.logo || '',
      url: c.url, quality: c.quality || '',
      backupUrls: c.backupUrls?.length ? c.backupUrls.slice(0, 4) : undefined,
    }));
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
  } catch { /* ignore */ }
}

/** Priority: Iran + Persian + IRIB + satellite Persian */
const PRIORITY_SOURCES: string[][] = [
  ['https://iptv-org.github.io/iptv/countries/ir.m3u', 'https://cdn.jsdelivr.net/gh/iptv-org/iptv@master/streams/ir.m3u'],
  ['https://iptv-org.github.io/iptv/languages/fas.m3u', 'https://cdn.jsdelivr.net/gh/iptv-org/iptv@master/streams/fas.m3u'],
  ['https://raw.githubusercontent.com/shayanline/iptv-iran/main/playlists/iran.m3u'],
  ['https://raw.githubusercontent.com/shayanline/iptv-iran/main/playlists/categories/irib-national.m3u'],
  ['https://raw.githubusercontent.com/shayanline/iptv-iran/main/playlists/categories/irib-provincial.m3u'],
  ['https://raw.githubusercontent.com/shayanline/iptv-iran/main/playlists/categories/irib-international.m3u'],
  ['https://raw.githubusercontent.com/shayanline/iptv-iran/main/playlists/categories/sat-general.m3u'],
  ['https://raw.githubusercontent.com/shayanline/iptv-iran/main/playlists/categories/sat-movies.m3u'],
];

/** Useful shelves — sports/nature/wrestling via sports+doc; no general world dump */
const EXTRA_SOURCES: string[][] = [
  ['https://iptv-org.github.io/iptv/categories/sports.m3u'],
  ['https://iptv-org.github.io/iptv/categories/documentary.m3u'],
  ['https://iptv-org.github.io/iptv/categories/kids.m3u'],
  ['https://iptv-org.github.io/iptv/categories/news.m3u'],
  ['https://iptv-org.github.io/iptv/categories/music.m3u'],
  ['https://iptv-org.github.io/iptv/categories/religious.m3u'],
  ['https://iptv-org.github.io/iptv/categories/cooking.m3u'],
  ['https://iptv-org.github.io/iptv/categories/movies.m3u'],
  ['https://iptv-org.github.io/iptv/categories/series.m3u'],
  ['https://iptv-org.github.io/iptv/categories/entertainment.m3u'],
  ['https://iptv-org.github.io/iptv/categories/animation.m3u'],
  ['https://iptv-org.github.io/iptv/categories/family.m3u'],
  ['https://iptv-org.github.io/iptv/categories/culture.m3u'],
  ['https://iptv-org.github.io/iptv/categories/outdoor.m3u'],
];

const ALL_SOURCE_COUNT =
  PRIORITY_SOURCES.reduce((n, m) => n + m.length, 0) +
  EXTRA_SOURCES.reduce((n, m) => n + m.length, 0);

const ENTITIES: Record<string, string> = {
  '&amp;': '&', '&quot;': '"', '&#39;': "'", '&apos;': "'",
  '&lt;': '<', '&gt;': '>', '&nbsp;': ' ',
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

async function fetchFirstMirror(mirrors: string[], timeoutMs: number): Promise<string> {
  for (const url of mirrors) {
    const body = await fetchText(url, timeoutMs);
    if (body && body.length > 32) return body;
  }
  return '';
}

function parseM3U(text: string): Channel[] {
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  const out: Channel[] = [];
  let pending: { name: string; group: string; logo: string; quality: string } | null = null;

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
      if (!name) { pending = null; continue; }
      const rawGroup = attrs['group-title'] || attrs['group'] || '';
      let group = groupKeyFor(rawGroup);
      group = refineGroupByName(group, name);
      pending = {
        name,
        group,
        logo: attrs['tvg-logo'] || attrs['logo'] || '',
        quality: qualityMatch ? qualityMatch[1] : '',
      };
      continue;
    }
    if (line.startsWith('#')) continue;
    if (pending && (line.startsWith('http://') || line.startsWith('https://') || line.startsWith('rtmp'))) {
      const id = (pending.name + '|' + line).toLowerCase().replace(/\s+/g, ' ');
      out.push({
        id, name: pending.name, group: pending.group,
        logo: pending.logo, url: line, quality: pending.quality,
      });
      pending = null;
    }
  }
  return out;
}

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
    if (!existing.logo && ch.logo) existing.logo = ch.logo;
    if (!existing.quality && ch.quality) existing.quality = ch.quality;
    if (ch.url && ch.url !== existing.url) {
      const backups = existing.backupUrls || [];
      if (!backups.includes(ch.url)) backups.push(ch.url);
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

const PERSIAN_HINT =
  /iran|irib|persian|farsi|تهران|استان|شبکه|جم |gem |manoto|bbc persian|voa|press tv|ofogh|varzesh|pooya|nahal|namayesh|tamasha|mostanad|amoozesh|irinn|شما|quran|پویا|نهال|ورزش|مستند|آموزش|خبر|قرآن|فارسی|ایران|ifilm|zagros|tapesh|pmc /i;

function isRelevant(ch: Channel): boolean {
  if (ch.group === 'Sex') return true;
  const blob = `${ch.name} ${ch.group}`;
  if (PERSIAN_HINT.test(blob)) return true;
  if (['Sports', 'Wrestling', 'Snooker', 'Nature', 'Kids', 'Cooking', 'Religious', 'Music', 'History', 'Motivation', 'Culture', 'Movies', 'Series', 'News', 'Family', 'Lifestyle'].includes(ch.group)) {
    return true;
  }
  if (ch.group === 'General' || ch.group === 'Other' || ch.group === 'Entertainment') {
    return PERSIAN_HINT.test(blob);
  }
  return true;
}

let cache: Channel[] | null = null;
let phase2Promise: Promise<Channel[]> | null = null;

async function loadSourceGroup(groups: string[][], perUrlMs: number): Promise<Channel[]> {
  const texts = await Promise.all(groups.map((m) => fetchFirstMirror(m, perUrlMs)));
  return mergeFromTexts(texts);
}

export async function loadChannels(force = false): Promise<{ channels: Channel[]; isOffline: boolean }> {
  if (!force && cache && cache.length) return { channels: cache, isOffline: false };

  if (force) {
    cache = null;
    phase2Promise = null;
  }

  if (!cache || !cache.length) cache = LOCAL_BASE.slice();

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
    let first = await Promise.race([
      phase1Work,
      new Promise<Channel[]>((r) => setTimeout(() => r([]), PHASE1_HARD_MS)),
    ]);
    if (!first.length) {
      first = await Promise.race([
        phase1Work,
        new Promise<Channel[]>((r) => setTimeout(() => r([]), 1800)),
      ]);
    }
    if (first.length) {
      cache = mergeInto(cache || [], first).filter(isRelevant);
      if (cache.length > 80) void writePersisted(cache);
    }

    if (!phase2Promise) {
      phase2Promise = (async () => {
        try {
          const [priority, extras] = await Promise.all([
            loadSourceGroup(PRIORITY_SOURCES, PER_URL_MS),
            loadSourceGroup(EXTRA_SOURCES, 7000),
          ]);
          let full = mergeInto(priority, extras).filter(isRelevant);

          // Soft caps only on non-Persian-heavy foreign shelves
          const byGroup = new Map<string, Channel[]>();
          for (const ch of full) {
            const arr = byGroup.get(ch.group) || [];
            arr.push(ch);
            byGroup.set(ch.group, arr);
          }
          const SOFT: Record<string, number> = {
            Sports: 200, Kids: 140, News: 160, Music: 120,
            Religious: 130, Cooking: 50, Culture: 120, Nature: 100,
            Movies: 200, Series: 150, Entertainment: 120, Wrestling: 80,
          };
          const trimmed: Channel[] = [];
          for (const [g, arr] of byGroup) {
            arr.sort((a, b) => {
              const ap = PERSIAN_HINT.test(a.name) ? 0 : 1;
              const bp = PERSIAN_HINT.test(b.name) ? 0 : 1;
              return ap - bp;
            });
            const limit = SOFT[g];
            trimmed.push(...(limit && arr.length > limit ? arr.slice(0, limit) : arr));
          }
          full = trimmed;
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

    if (!cache || !cache.length) return { channels: LOCAL_BASE, isOffline: true };
    return { channels: cache, isOffline: false };
  } catch {
    return { channels: cache?.length ? cache : LOCAL_BASE, isOffline: !cache };
  }
}

export async function waitForFullCatalogue(maxMs = 16000): Promise<Channel[]> {
  if (cache && cache.length > 150) return cache;
  if (!phase2Promise) await loadChannels(false);
  if (phase2Promise) {
    const done = await Promise.race([
      phase2Promise,
      new Promise<Channel[]>((r) => setTimeout(() => r(cache || []), maxMs)),
    ]);
    if (done?.length) return done;
  }
  return cache?.length ? cache : LOCAL_BASE;
}

export const PLAYLIST_SOURCE_COUNT = ALL_SOURCE_COUNT;
export function getCachedChannelCount(): number {
  return cache?.length ?? 0;
}
