// Live channel playlist loader for Arshia TV.
//
// Channels come from a public, community-maintained free-to-air index (iptv-org) rather
// than a list baked into the app, so channel names, logos and stream addresses stay
// current without shipping a new build. If the playlist cannot be reached, the caller
// falls back to the offline sample list in data/channels.ts.

import api from '../services/api';
import { Channel, SAMPLE_CHANNELS, groupKeyFor } from '../data/channels';

// Several public iptv-org playlists are merged so the folders are full: everything
// broadcast from Iran, everything in Persian, plus the world sports and kids shelves.
const PLAYLIST_URLS = [
  'https://iptv-org.github.io/iptv/countries/ir.m3u',
  'https://iptv-org.github.io/iptv/languages/fas.m3u',
  'https://iptv-org.github.io/iptv/categories/sports.m3u',
  'https://iptv-org.github.io/iptv/categories/kids.m3u',
];

// The world shelves hold thousands of entries. Keep the first slice of each so the
// folders stay browsable and the app stays light on a phone.
const EXTRA_PLAYLIST_CAP = 120;

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

/**
 * Turns an M3U/M3U8 playlist into channels. Each entry is an `#EXTINF` line with
 * tvg-id / tvg-logo / group-title attributes followed by its stream URL.
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
        // Snooker and billiards arrive tagged as generic sport, so lift them into
        // their own folder by name when the playlist does not do it for us.
        group: group === 'Sports' && /snooker|billiard/i.test(name) ? 'Snooker' : group,
        logo: attrs['tvg-logo'] || '',
        quality: quality ? quality[1] : '',
      };
      continue;
    }

    if (line.startsWith('#')) continue;

    // Any non-comment line is the stream address for the entry above it.
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
  /** True when the live playlist could not be loaded and the offline list is shown. */
  isOffline: boolean;
}

export async function loadChannels(force: boolean = false): Promise<ChannelResult> {
  if (cache && !force) {
    return { channels: cache, isOffline: false };
  }

  try {
    const responses = await Promise.all(
      PLAYLIST_URLS.map((url) => api.get(url).catch(() => ''))
    );

    const merged: Channel[] = [];
    const seen = new Set<string>();

    responses.forEach((raw, index) => {
      let list = parsePlaylist(typeof raw === 'string' ? raw : '');
      if (!list.length) return;
      list.sort((a, b) => a.name.localeCompare(b.name));
      if (index > 0 && list.length > EXTRA_PLAYLIST_CAP) {
        list = list.slice(0, EXTRA_PLAYLIST_CAP);
      }
      list.forEach((channel) => {
        // The same channel can appear on more than one playlist.
        const key = `${channel.name.toLowerCase()}|${channel.group}`;
        if (seen.has(key)) return;
        seen.add(key);
        merged.push(channel);
      });
    });

    if (!merged.length) throw new Error('empty playlist');
    cache = merged;
    return { channels: merged, isOffline: false };
  } catch (error) {
    return { channels: SAMPLE_CHANNELS, isOffline: true };
  }
                       }
        
