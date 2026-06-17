import { SongsResponse } from "./types";

const API_BASE: string =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ||
  "http://localhost:4000";

export interface FetchParams {
  seed: string;
  page: number;
  locale: string;
  likes: number;
}

export async function fetchSongs(
  params: FetchParams,
  signal?: AbortSignal
): Promise<SongsResponse> {
  const qs = new URLSearchParams({
    seed: params.seed,
    page: String(params.page),
    locale: params.locale,
    likes: String(params.likes),
  });
  const res = await fetch(`${API_BASE}/api/songs?${qs.toString()}`, { signal });
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
  return (await res.json()) as SongsResponse;
}
