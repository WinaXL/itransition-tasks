import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";

interface Dirty {
  value: string;
  version: number | null;
}

interface SaveResult {
  attributeId: string;
  version?: number;
  conflict?: boolean;
  current?: string;
}

/**
 * Auto-save for attribute values: edits are tracked locally and flushed in one
 * batch every few seconds (not per keystroke). Each value carries its version
 * for optimistic locking; on conflict the server value wins and the caller is
 * notified so the UI can show a message.
 */
export function useAutoSave(
  userId: string | undefined,
  onSaved: (attributeId: string, version: number) => void,
  onConflict: (attributeId: string, currentValue: string, version: number) => void,
  intervalMs = 6000
) {
  const dirtyRef = useRef<Map<string, Dirty>>(new Map());
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const flushing = useRef(false);

  const flush = useCallback(async () => {
    if (!userId || flushing.current || dirtyRef.current.size === 0) return;
    flushing.current = true;
    const batch = [...dirtyRef.current.entries()].map(([attributeId, d]) => ({ attributeId, ...d }));
    dirtyRef.current.clear();
    setStatus("saving");
    try {
      const { results } = await api.patch<{ results: SaveResult[] }>(`/api/profile/${userId}/values`, { values: batch });
      for (const r of results) {
        if (r.conflict) onConflict(r.attributeId, r.current ?? "", r.version ?? 1);
        else if (r.version !== undefined && !dirtyRef.current.has(r.attributeId)) onSaved(r.attributeId, r.version);
        else if (r.version !== undefined) {
          // Edited again while saving — carry the fresh version into the next flush.
          const pending = dirtyRef.current.get(r.attributeId)!;
          dirtyRef.current.set(r.attributeId, { ...pending, version: r.version });
          onSaved(r.attributeId, r.version);
        }
      }
      setStatus("saved");
    } catch {
      // Network failure: put the batch back so nothing is lost.
      for (const item of batch) {
        if (!dirtyRef.current.has(item.attributeId))
          dirtyRef.current.set(item.attributeId, { value: item.value, version: item.version });
      }
      setStatus("idle");
    } finally {
      flushing.current = false;
    }
  }, [userId, onSaved, onConflict]);

  useEffect(() => {
    const timer = setInterval(() => void flush(), intervalMs);
    return () => clearInterval(timer);
  }, [flush, intervalMs]);

  // Best effort flush when the user leaves the page entirely.
  useEffect(() => {
    const handler = () => void flush();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [flush]);

  // beforeunload does not fire on SPA navigation: flush pending edits when the
  // editor unmounts (react-router route change) and when the tab is hidden,
  // so a quick navigation never loses the current batch.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      void flush();
    };
  }, [flush]);

  const track = useCallback((attributeId: string, value: string, version: number | null) => {
    dirtyRef.current.set(attributeId, { value, version });
    setStatus("idle");
  }, []);

  return { track, flush, status };
}
