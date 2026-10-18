import { fbGet, fbSet } from './firebase';

export interface ScheduleItem {
  id: string;
  channelId: string;
  channelName: string;
  title: string;
  startAt: number;
  endAt?: number;
  source?: string;
  brand: string;
  createdAt: number;
}

export interface ArchiveItem {
  id: string;
  channelId: string;
  channelName: string;
  title: string;
  url?: string;
  airedAt: number;
  brand: string;
  createdAt: number;
}

/** Admin or automated system registers a programme slot under Arshia TV brand */
export async function upsertScheduleItem(input: {
  channelId: string;
  channelName: string;
  title: string;
  startAt: number;
  endAt?: number;
  source?: string;
}): Promise<{ ok: boolean; id?: string }> {
  const id = `sch_${input.channelId}_${input.startAt}`;
  const item: ScheduleItem = {
    id,
    channelId: input.channelId,
    channelName: input.channelName,
    title: input.title,
    startAt: input.startAt,
    endAt: input.endAt,
    source: input.source,
    brand: 'آرشیا تی‌وی',
    createdAt: Date.now(),
  };
  try {
    await fbSet(`schedule/${input.channelId}/${id}`, item);
    return { ok: true, id };
  } catch {
    return { ok: false };
  }
}

export async function listScheduleForChannel(
  channelId: string,
  limit = 40
): Promise<ScheduleItem[]> {
  try {
    const data = await fbGet(`schedule/${channelId}`);
    if (!data) return [];
    return Object.values(data as Record<string, ScheduleItem>)
      .filter(Boolean)
      .sort((a, b) => (a.startAt || 0) - (b.startAt || 0))
      .slice(0, limit);
  } catch {
    return [];
  }
}

export async function addArchiveItem(input: {
  channelId: string;
  channelName: string;
  title: string;
  url?: string;
  airedAt?: number;
}): Promise<{ ok: boolean; id?: string }> {
  const id = `arc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const item: ArchiveItem = {
    id,
    channelId: input.channelId,
    channelName: input.channelName,
    title: input.title,
    url: input.url,
    airedAt: input.airedAt || Date.now(),
    brand: 'آرشیا تی‌وی',
    createdAt: Date.now(),
  };
  try {
    await fbSet(`archive/${input.channelId}/${id}`, item);
    return { ok: true, id };
  } catch {
    return { ok: false };
  }
}

export async function listArchiveForChannel(
  channelId: string,
  limit = 50
): Promise<ArchiveItem[]> {
  try {
    const data = await fbGet(`archive/${channelId}`);
    if (!data) return [];
    return Object.values(data as Record<string, ArchiveItem>)
      .filter(Boolean)
      .sort((a, b) => (b.airedAt || 0) - (a.airedAt || 0))
      .slice(0, limit);
  } catch {
    return [];
  }
}

/** Seed a few sample slots for a channel so UI is never empty */
export async function ensureSampleSchedule(
  channelId: string,
  channelName: string
): Promise<void> {
  try {
    const existing = await listScheduleForChannel(channelId, 5);
    if (existing.length > 0) return;
    const now = Date.now();
    const hour = 60 * 60 * 1000;
    const samples = [
      { title: 'پخش زنده', offset: 0 },
      { title: 'برنامه ویژه', offset: hour },
      { title: 'اخبار و گزارش', offset: hour * 2 },
      { title: 'فیلم و سریال', offset: hour * 3 },
    ];
    for (const s of samples) {
      await upsertScheduleItem({
        channelId,
        channelName,
        title: s.title,
        startAt: now + s.offset,
        endAt: now + s.offset + hour,
      });
    }
  } catch {}
}
