import { fbGet, fbSet, fbUpdate, fbRemove } from './firebase';

export type ChannelStatus = 'pending' | 'approved' | 'rejected';

export interface UserChannel {
  id: string;
  ownerId: string;
  ownerName: string;
  name: string;
  description: string;
  logo: string; // url or empty
  createdAt: number;
  status: ChannelStatus;
  rejectReason?: string;
}

export interface UserUpload {
  id: string;
  channelId: string;
  ownerId: string;
  title: string;
  description: string;
  type: 'movie' | 'series' | 'clip';
  url: string;
  poster?: string;
  createdAt: number;
  status: ChannelStatus;
  rejectReason?: string;
  autoFlags?: string[]; // auto moderation hints
}

const BLOCKED_WORDS = [
  'sex', 'xxx', 'porn', 'سکس', 'پورن', '18+', 'nude', 'nsfw',
];

export function autoModerateText(...parts: string[]): string[] {
  const flags: string[] = [];
  const blob = parts.join(' ').toLowerCase();
  for (const w of BLOCKED_WORDS) {
    if (blob.includes(w.toLowerCase())) flags.push(`محتوای غیرمجاز: ${w}`);
  }
  if (parts.some((p) => !p || !String(p).trim())) flags.push('عنوان یا توضیحات خالی است');
  return flags;
}

export async function createUserChannel(input: {
  ownerId: string;
  ownerName: string;
  name: string;
  description: string;
  logo?: string;
}): Promise<{ ok: boolean; id?: string; message?: string; flags?: string[] }> {
  const flags = autoModerateText(input.name, input.description);
  if (flags.some((f) => f.startsWith('محتوای غیرمجاز'))) {
    return { ok: false, message: 'این محتوا مجاز نیست', flags };
  }
  const id = `ch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const channel: UserChannel = {
    id,
    ownerId: input.ownerId,
    ownerName: input.ownerName,
    name: input.name.trim(),
    description: input.description.trim(),
    logo: input.logo || '',
    createdAt: Date.now(),
    status: 'pending',
  };
  try {
    await fbSet(`userChannels/${id}`, channel);
    return { ok: true, id, flags };
  } catch {
    return { ok: false, message: 'خطا در ذخیره کانال' };
  }
}

export async function submitUpload(input: {
  channelId: string;
  ownerId: string;
  title: string;
  description: string;
  type: 'movie' | 'series' | 'clip';
  url: string;
  poster?: string;
}): Promise<{ ok: boolean; id?: string; message?: string; flags?: string[] }> {
  const flags = autoModerateText(input.title, input.description, input.url);
  if (!input.url || !(/^(https?:\/\/|file:\/\/|content:\/\/)/i.test(input.url))) {
    flags.push('لینک پخش معتبر نیست');
  }
  if (flags.some((f) => f.startsWith('محتوای غیرمجاز') || f.includes('معتبر نیست'))) {
    return { ok: false, message: flags[0], flags };
  }
  const id = `up_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const upload: UserUpload = {
    id,
    channelId: input.channelId,
    ownerId: input.ownerId,
    title: input.title.trim(),
    description: input.description.trim(),
    type: input.type,
    url: input.url.trim(),
    poster: input.poster,
    createdAt: Date.now(),
    status: 'pending',
    autoFlags: flags.length ? flags : undefined,
  };
  try {
    await fbSet(`userUploads/${id}`, upload);
    return { ok: true, id, flags };
  } catch {
    return { ok: false, message: 'خطا در ارسال محتوا' };
  }
}

export async function listPendingChannels(): Promise<UserChannel[]> {
  try {
    const data = await fbGet('userChannels');
    if (!data) return [];
    return Object.values(data as Record<string, UserChannel>).filter((c) => c.status === 'pending');
  } catch {
    return [];
  }
}

export async function listPendingUploads(): Promise<UserUpload[]> {
  try {
    const data = await fbGet('userUploads');
    if (!data) return [];
    return Object.values(data as Record<string, UserUpload>).filter((u) => u.status === 'pending');
  } catch {
    return [];
  }
}

export async function setChannelStatus(id: string, status: ChannelStatus, rejectReason?: string) {
  await fbUpdate(`userChannels/${id}`, { status, rejectReason: rejectReason || null });
}

export async function setUploadStatus(id: string, status: ChannelStatus, rejectReason?: string) {
  await fbUpdate(`userUploads/${id}`, { status, rejectReason: rejectReason || null });
  // When approved, publish to public catalog so every install sees it
  if (status === 'approved') {
    try {
      const upload = await fbGet(`userUploads/${id}`);
      if (upload && upload.url) {
        const catId = `cat_user_${id}`;
        await fbSet(`catalog/${catId}`, {
          id: catId,
          title: upload.title || 'محتوای کاربر',
          category: 'کاربری',
          kind: upload.type === 'clip' ? 'other' : 'movie',
          url: upload.url,
          poster: upload.poster || '',
          source: upload.url,
          createdAt: Date.now(),
          playCount: 0,
          status: 'active',
          addedBy: 'user',
          ownerId: upload.ownerId || '',
          channelId: upload.channelId || '',
        });
        await fbSet(`catalogByCategory/کاربری/${catId}`, true);
      }
    } catch {}
  }
}

export async function listApprovedChannels(): Promise<UserChannel[]> {
  try {
    const data = await fbGet('userChannels');
    if (!data) return [];
    return Object.values(data as Record<string, UserChannel>)
      .filter((c) => c && c.status === 'approved')
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch {
    return [];
  }
}

export async function listApprovedUploads(): Promise<UserUpload[]> {
  try {
    const data = await fbGet('userUploads');
    if (!data) return [];
    return Object.values(data as Record<string, UserUpload>).filter((u) => u.status === 'approved');
  } catch {
    return [];
  }
}

export async function listMyChannels(ownerId: string): Promise<UserChannel[]> {
  try {
    const data = await fbGet('userChannels');
    if (!data) return [];
    return Object.values(data as Record<string, UserChannel>).filter((c) => c.ownerId === ownerId);
  } catch {
    return [];
  }
}
