import { useQuery } from "@tanstack/react-query";
import { signedFileUrlQuery } from "@/lib/queries";

/**
 * Returns a resolved, usable URL for a resource:
 * - external `url` wins if present
 * - otherwise generates a 1-hour signed URL for the file in the private storage bucket.
 */
export function useResourceUrl(opts: { url?: string | null; file_path?: string | null }) {
  const { url, file_path } = opts;
  const q = useQuery({ ...signedFileUrlQuery(file_path ?? null), enabled: !url && !!file_path });
  if (url) return { url, loading: false, error: null as unknown };
  return { url: (q.data as string | undefined) ?? null, loading: q.isLoading, error: q.error };
}
