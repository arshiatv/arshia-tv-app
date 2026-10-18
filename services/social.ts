import { fbGet, fbSet, fbUpdate } from './firebase';

export interface Comment {
  id: string;
  targetId: string;
  targetType: 'upload' | 'catalog' | 'channel';
  userId: string;
  userName: string;
  text: string;
  createdAt: number;
}

export async function toggleLike(input: {
  targetId: string;
  userId: string;
}): Promise<{ liked: boolean; count: number }> {
  const path = `likes/${input.targetId}`;
  try {
    const data = (await fbGet(path)) || {};
    const key = input.userId.replace(/[.#$/[\]]/g, '_');
    const currently = !!data[key];
    if (currently) {
      await fbSet(`${path}/${key}`, null as any);
    } else {
      await fbSet(`${path}/${key}`, { at: Date.now(), userId: input.userId });
    }
    const next = (await fbGet(path)) || {};
    const count = Object.keys(next).filter((k) => next[k]).length;
    return { liked: !currently, count };
  } catch {
    return { liked: false, count: 0 };
  }
}

export async function getLikeState(targetId: string, userId?: string) {
  try {
    const data = (await fbGet(`likes/${targetId}`)) || {};
    const count = Object.keys(data).filter((k) => data[k]).length;
    const key = userId ? userId.replace(/[.#$/[\]]/g, '_') : '';
    const liked = key ? !!data[key] : false;
    return { liked, count };
  } catch {
    return { liked: false, count: 0 };
  }
}

export async function toggleFollow(input: {
  channelId: string;
  userId: string;
}): Promise<{ following: boolean; count: number }> {
  const path = `follows/${input.channelId}`;
  try {
    const data = (await fbGet(path)) || {};
    const key = input.userId.replace(/[.#$/[\]]/g, '_');
    const currently = !!data[key];
    if (currently) {
      await fbSet(`${path}/${key}`, null as any);
    } else {
      await fbSet(`${path}/${key}`, { at: Date.now(), userId: input.userId });
    }
    const next = (await fbGet(path)) || {};
    const count = Object.keys(next).filter((k) => next[k]).length;
    return { following: !currently, count };
  } catch {
    return { following: false, count: 0 };
  }
}

export async function getFollowState(channelId: string, userId?: string) {
  try {
    const data = (await fbGet(`follows/${channelId}`)) || {};
    const count = Object.keys(data).filter((k) => data[k]).length;
    const key = userId ? userId.replace(/[.#$/[\]]/g, '_') : '';
    const following = key ? !!data[key] : false;
    return { following, count };
  } catch {
    return { following: false, count: 0 };
  }
}

export async function addComment(input: {
  targetId: string;
  targetType: 'upload' | 'catalog' | 'channel';
  userId: string;
  userName: string;
  text: string;
}): Promise<{ ok: boolean; id?: string; message?: string }> {
  const text = (input.text || '').trim();
  if (text.length < 1) return { ok: false, message: 'متن خالی است' };
  if (text.length > 500) return { ok: false, message: 'متن خیلی طولانی است' };
  const id = `cm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const comment: Comment = {
    id,
    targetId: input.targetId,
    targetType: input.targetType,
    userId: input.userId,
    userName: input.userName || 'کاربر',
    text,
    createdAt: Date.now(),
  };
  try {
    await fbSet(`comments/${input.targetId}/${id}`, comment);
    return { ok: true, id };
  } catch {
    return { ok: false, message: 'ثبت نشد' };
  }
}

export async function listComments(targetId: string, limit = 80): Promise<Comment[]> {
  try {
    const data = await fbGet(`comments/${targetId}`);
    if (!data) return [];
    return Object.values(data as Record<string, Comment>)
      .filter((c) => c && c.text)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .slice(0, limit);
  } catch {
    return [];
  }
}

export async function deleteComment(targetId: string, commentId: string): Promise<boolean> {
  try {
    await fbSet(`comments/${targetId}/${commentId}`, null as any);
    return true;
  } catch {
    return false;
  }
}
