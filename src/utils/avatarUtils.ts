/**
 * Get proxied URL for any image to enable CORS
 */
export function getProxiedImageUrl(imageUrl: string): string {
  return `/api/github/proxy-image?url=${encodeURIComponent(imageUrl)}`;
}
