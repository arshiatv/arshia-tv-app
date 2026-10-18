export interface Ad {
  id?: string;
  title: string;
  sourceUrl: string;
  placement: 'pre-roll' | 'mid-roll';
  targets?: string[];
  active?: boolean;
  frequencySeconds?: number;
  durationSeconds?: number;
  scheduleStart?: number;
  scheduleEnd?: number;
  rotationOrder?: number;
  createdAt?: number;
}

// NOTE:
// This service uses the Firebase Realtime Database REST API.
// Replace FIREBASE_URL with your project's database URL (example: https://your-project-default-rtdb.firebaseio.com)

const FIREBASE_URL = 'https://arshiyatv-59a63-default-rtdb.firebaseio.com';

export async function fetchAllAds(): Promise<Record<string, Ad> | null> {
  try {
    const res = await fetch(`${FIREBASE_URL}/ads.json`);
    if (!res.ok) return null;
    const data = await res.json();
    return data || null;
  } catch (error) {
    console.log('fetchAllAds error', error);
    return null;
  }
}

export async function createAdRemote(ad: Omit<Ad, 'id' | 'createdAt'>): Promise<string | null> {
  try {
    const body = { ...ad, active: !!ad.active, createdAt: Date.now() };
    const res = await fetch(`${FIREBASE_URL}/ads.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    return json.name || null;
  } catch (error) {
    console.log('createAdRemote error', error);
    return null;
  }
}

export async function updateAdRemote(id: string, patch: Partial<Ad>): Promise<boolean> {
  try {
    const res = await fetch(`${FIREBASE_URL}/ads/${id}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    return res.ok;
  } catch (error) {
    console.log('updateAdRemote error', error);
    return false;
  }
}

export async function deleteAdRemote(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${FIREBASE_URL}/ads/${id}.json`, { method: 'DELETE' });
    return res.ok;
  } catch (error) {
    console.log('deleteAdRemote error', error);
    return false;
  }
}
