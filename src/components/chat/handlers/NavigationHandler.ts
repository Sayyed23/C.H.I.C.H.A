
export const handleNavigation = (
  message: string,
  onSend: (message: string, options?: { targetLanguage?: string }) => void
): boolean => {
  const navigationMatch = message.match(/From:\s*([^To]+)\s*To:\s*(.+)/i);
  if (!navigationMatch) return false;

  const [, from, to] = navigationMatch;
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(from.trim())}&destination=${encodeURIComponent(to.trim())}`;
  onSend(`🗺️ Here's your route: [Open in Google Maps](${googleMapsUrl})`);
  return true;
};
