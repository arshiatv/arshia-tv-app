import { useEffect, useState } from "react";
import database from "@react-native-firebase/database";

/**
 * useRealtimeList
 * - path: Realtime DB path (e.g. "/content/persian/movies")
 * - returns { data, loading, error }
 * Converts child objects into array of { id, ...fields }
 */

export function useRealtimeList(path: string) {
  const [data, setData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const ref = database().ref(path);

    const onValue = (snap: any) => {
      try {
        const val = snap.exists() ? snap.val() : null;
        let list: any[] = [];
        if (Array.isArray(val)) {
          list = val.filter(Boolean) as any[];
        } else if (val && typeof val === "object") {
          list = Object.keys(val).map((k) => ({ id: k, ...val[k] }));
        }
        setData(list);
        setLoading(false);
      } catch (e: any) {
        setError(e);
        setLoading(false);
      }
    };

    ref.on("value", onValue, (err: any) => {
      setError(err);
      setLoading(false);
    });

    return () => {
      ref.off("value", onValue);
    };
  }, [path]);

  return { data, loading, error };
}
