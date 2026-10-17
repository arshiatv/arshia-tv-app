import { fbGet, fbSet } from './firebase';

export interface SupportThread {
  id: string;
  userId: string;
  userLabel: string;
  createdAt: number;
  updatedAt: number;
  lastMessage?: string;
}

export interface SupportMessage {
  id: string;
  threadId: string;
  from: 'user' | 'support';
  text: string;
  createdAt: number;
  receiptUrl?: string;
}

export async function createSupportThread(userId: string, userLabel: string, firstText: string, receiptUrl?: string) {
  const id = `th_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const thread: SupportThread = {
    id,
    userId,
    userLabel,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lastMessage: firstText,
  };
  await fbSet(`supportThreads/${id}`, thread);
  const msgId = `m_${Date.now()}`;
  const msg: SupportMessage = {
    id: msgId,
    threadId: id,
    from: 'user',
    text: firstText,
    createdAt: Date.now(),
    receiptUrl,
  };
  await fbSet(`supportMessages/${id}/${msgId}`, msg);
  return id;
}

export async function sendSupportMessage(threadId: string, from: 'user' | 'support', text: string) {
  const msgId = `m_${Date.now()}`;
  const msg: SupportMessage = {
    id: msgId,
    threadId,
    from,
    text,
    createdAt: Date.now(),
  };
  await fbSet(`supportMessages/${threadId}/${msgId}`, msg);
  await fbSet(`supportThreads/${threadId}/updatedAt`, Date.now());
  await fbSet(`supportThreads/${threadId}/lastMessage`, text);
}

export async function listThreadMessages(threadId: string): Promise<SupportMessage[]> {
  try {
    const data = await fbGet(`supportMessages/${threadId}`);
    if (!data) return [];
    return Object.values(data as Record<string, SupportMessage>).sort((a, b) => a.createdAt - b.createdAt);
  } catch {
    return [];
  }
}

export async function listUserThreads(userId: string): Promise<SupportThread[]> {
  try {
    const data = await fbGet('supportThreads');
    if (!data) return [];
    return Object.values(data as Record<string, SupportThread>)
      .filter((t) => t.userId === userId)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export async function deleteThread(threadId: string) {
  await fbSet(`supportThreads/${threadId}`, null);
  await fbSet(`supportMessages/${threadId}`, null);
}
