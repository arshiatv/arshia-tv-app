/* services/firebase.ts

   Simple Firebase Realtime Database helper using the public REST API.
   - Reads and writes JSON at paths under the provided database URL.
   - Exposes get, set, update, remove helpers and a small React hook that polls
     for changes using ETag when available.

   Note: This implementation uses fetch and works without adding native modules.
   For true push-based real-time updates, replace this with the Firebase Web SDK
   and use onValue() listeners. To use SDK you'll need Firebase web config.
*/

const FIREBASE_URL = 'https://firebaseio.com';

export async function fbGet(path: string) {
  const url = `${FIREBASE_URL}/${path}.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fbGet ${res.status} ${res.statusText}`);
  return res.json();
}

export async function fbSet(path: string, value: any) {
  const url = `${FIREBASE_URL}/${path}.json`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(value),
  });
  if (!res.ok) throw new Error(`fbSet ${res.status} ${res.statusText}`);
  return res.json();
}

export async function fbUpdate(path: string, value: any) {
  const url = `${FIREBASE_URL}/${path}.json`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(value),
  });
  if (!res.ok) throw new Error(`fbUpdate ${res.status} ${res.statusText}`);
  return res.json();
}

export async function fbRemove(path: string) {
  const url = `${FIREBASE_URL}/${path}.json`;
  const res = await fetch(url, { method: 'DELETE' });
  if (!res.ok) throw new Error(`fbRemove ${res.status} ${res.statusText}`);
  return res.json();
}

// A small hook-like helper: poll for changes and call listener when changed.
export function createPollListener(path: string, intervalMs = 3000) {
  let etag: string | null = null;
  let stopped = false;

  const start = (onChange: (data: any) => void) => {
    stopped = false;
    const run = async () => {
      if (stopped) return;
      try {
        const url = `${FIREBASE_URL}/${path}.json`;
        const res = await fetch(url, { headers: etag ? { 'If-None-Match': etag } : {} });
        if (res.status === 200) {
          etag = res.headers.get('ETag');
          const data = await res.json();
          onChange(data);
        }
      } catch (err) {
        // swallow — caller should handle offline
      }
      setTimeout(run, intervalMs);
    };
    run();
  };

  const stop = () => {
    stopped = true;
  };

  return { start, stop };
}
