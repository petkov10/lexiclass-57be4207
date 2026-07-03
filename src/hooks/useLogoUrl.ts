import { useQuery } from "@tanstack/react-query";
import { signedBrandingUrlQuery } from "@/lib/queries";

const PREFIX = "branding://";

/**
 * Resolves the stored `logo_url` value into a usable image URL.
 * - Values starting with `branding://` reference an object in the private
 *   `branding` bucket and are resolved to a fresh signed URL.
 * - Anything else (external URLs, legacy public URLs) is returned as-is.
 * - Empty / null returns null.
 */
export function useLogoUrl(logoUrl?: string | null): string | null {
  const path = logoUrl?.startsWith(PREFIX) ? logoUrl.slice(PREFIX.length) : null;
  const q = useQuery({ ...signedBrandingUrlQuery(path), enabled: !!path });
  if (!logoUrl) return null;
  if (path) return (q.data as string | undefined) ?? null;
  return logoUrl;
}

export const BRANDING_PREFIX = PREFIX;
