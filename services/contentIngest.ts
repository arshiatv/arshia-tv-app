import { fbGet, fbSet, fbUpdate } from './firebase';

export type ContentKind = 'movie' | 'series' | 'live' | 'other';

export interface CatalogItem {
  id: string;
  title: string;
  category: string;
  kind: ContentKind;
  url: string;
  poster?: string;
  source?: string;
  createdAt: number;
  verifiedAt?: number;
  playCount?: number;
  status: 'pending' | 'active' | 'blocked';
  addedBy: 'admin' | 'auto' | 'user';
}

function guessKind(url: string, title: string): ContentKind {
  const u = (url + ' ' + title).toLowerCase();
  if (u.includes('series') || u.includes('فصل') || u.includes('serial')) return 'series';
  if (u.includes('.m3u8') || u.includes('live') || u.includes('iptv')) return 'live';
  if (u.includes('movie') || u.includes('film') || u.includes('فیلم')) return 'movie';
  return 'movie';
}

function guessCategory(title: string, kind: ContentKind): string {
  const t = title.toLowerCase();
  if (/انیمه|anime/.test(t)) return 'انیمه';
  if (/کودک|کارتون|kids|child/.test(t)) return 'کودک';
  if (/مستند|documentary/.test(t)) return 'مستند';
  if (/کمدی|comedy/.test(t)) return 'کمدی';
  if (/اکشن|action/.test(t)) return 'اکشن';
  if (/ورزش|sport|snooker|کشتی/.test(t)) return 'ورزشی';
  if (kind === 'series') return 'سریال';
  if (kind === 'live') return 'زنده';
  return 'عمومی';
}

function titleFromUrl(url: string): string {
  try {
    const path = decodeURIComponent(url.split('?')[0]);
    const last = path.split('/').filter(Boolean).pop() || 'بدون‌نام';
    return last.replace(/\.(m3u8|mp4|mkv|avi)$/i, '').replace(/[-_]+/g, ' ').trim() || 'بدون‌نام';
  } catch {
    return 'بدون‌نام';
  }
}

/** Admin pastes a direct stream URL or page link → saved into permanent catalog */
export async function ingestFromAdmin(input: {
  url: string;
  title?: string;
  category?: string;
  kind?: ContentKind;
  poster?: string;
}): Promise<{ ok: boolean; id?: string; message?: string; item?: CatalogItem }> {
  const url = (input.url || '').trim();
  if (!/^https?:\/\//i.test(url)) {
    return { ok: false, message: 'لینک باید با http یا https شروع شود' };
  }
  const title = (input.title || titleFromUrl(url)).trim();
  const kind = input.kind || guessKind(url, title);
  const category = (input.category || guessCategory(title, kind)).trim();
  const id = `cat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const item: CatalogItem = {
    id,
    title,
    category,
    kind,
    url,
    poster: input.poster,
    source: url,
    createdAt: Date.now(),
    playCount: 0,
    status: 'active',
    addedBy: 'admin',
  };
  try {
    await fbSet(`catalog/${id}`, item);
    // index by category for faster reads
    await fbSet(`catalogByCategory/${category}/${id}`, true);
    return { ok: true, id, item };
  } catch {
    return { ok: false, message: 'ذخیره در سرور انجام نشد' };
  }
}

/**
 * When a viewer successfully plays a stream, we permanently register that working URL
 * in our catalog. The heavy download traffic is paid by the viewer; we only store metadata + URL
 * (not a full re-upload of the video file — full re-hosting would cost server bandwidth/storage).
 */
export async function registerPlaySuccess(input: {
  url: string;
  title?: string;
  kind?: ContentKind;
}): Promise<void> {
  const url = (input.url || '').trim();
  if (!url) return;
  let h = 0;
  for (let i = 0; i < url.length; i++) h = (Math.imul(31, h) + url.charCodeAt(i)) | 0;
  const key = Math.abs(h).toString(36) + '_' + url.length;
  const id = `auto_${key}`;
  try {
    const existing = await fbGet(`catalog/${id}`);
    if (existing && existing.url) {
      await fbUpdate(`catalog/${id}`, {
        playCount: (existing.playCount || 0) + 1,
        verifiedAt: Date.now(),
        status: 'active',
      });
      return;
    }
    const title = (input.title || titleFromUrl(url)).trim();
    const kind = input.kind || guessKind(url, title);
    const category = guessCategory(title, kind);
    const item: CatalogItem = {
      id,
      title,
      category,
      kind,
      url,
      source: url,
      createdAt: Date.now(),
      verifiedAt: Date.now(),
      playCount: 1,
      status: 'active',
      addedBy: 'auto',
    };
    await fbSet(`catalog/${id}`, item);
    await fbSet(`catalogByCategory/${category}/${id}`, true);
  } catch {
    // silent — playback must not fail because of catalog write
  }
}

export async function listCatalog(limit = 500): Promise<CatalogItem[]> {
  try {
    const data = await fbGet('catalog');
    if (!data) return [];
    const list = Object.values(data as Record<string, CatalogItem>)
      .filter((x) => x && x.status !== 'blocked' && x.url)
      .sort((a, b) => (b.verifiedAt || b.createdAt || 0) - (a.verifiedAt || a.createdAt || 0));
    return list.slice(0, limit);
  } catch {
    return [];
  }
}

export async function listCatalogByCategory(category: string): Promise<CatalogItem[]> {
  const all = await listCatalog();
  return all.filter((x) => x.category === category);
}

export function isDirectStreamUrl(url: string): boolean {
  const u = (url || '').toLowerCase().split('?')[0];
  return (
    u.endsWith('.m3u8') ||
    u.endsWith('.mp4') ||
    u.endsWith('.mkv') ||
    u.endsWith('.webm') ||
    u.endsWith('.ts') ||
    u.includes('/playlist.m3u8') ||
    u.includes('.m3u8') ||
    u.includes('manifest')
  );
}

export async function updateCatalogItem(
  id: string,
  patch: Partial<CatalogItem>
): Promise<{ ok: boolean; message?: string }> {
  try {
    const existing = await fbGet(`catalog/${id}`);
    if (!existing) return { ok: false, message: 'مورد پیدا نشد' };
    const next = { ...existing, ...patch, id };
    await fbSet(`catalog/${id}`, next);
    if (patch.category && patch.category !== existing.category) {
      try {
        await fbUpdate(`catalogByCategory/${existing.category}/${id}`, null as any);
      } catch {}
      await fbSet(`catalogByCategory/${patch.category}/${id}`, true);
    }
    return { ok: true };
  } catch {
    return { ok: false, message: 'ذخیره نشد' };
  }
}

export async function deleteCatalogItem(id: string): Promise<{ ok: boolean }> {
  try {
    const existing = await fbGet(`catalog/${id}`);
    if (existing?.category) {
      try {
        await fbUpdate(`catalogByCategory/${existing.category}/${id}`, null as any);
      } catch {}
    }
    await fbSet(`catalog/${id}`, null as any);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function listAllCatalogAdmin(): Promise<CatalogItem[]> {
  try {
    const data = await fbGet('catalog');
    if (!data) return [];
    return Object.values(data as Record<string, CatalogItem>)
      .filter((x) => x && x.id)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch {
    return [];
  }
}
