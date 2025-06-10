
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export const handleLocation = async (
  message: string,
  onSend: (message: string, options?: { targetLanguage?: string }) => void
): Promise<boolean> => {
  const locationMatch = message.match(/find (?:location|place)(?:s)? (?:of|for|in)?\s+(.+)/i);
  if (!locationMatch && !message.toLowerCase().includes("find on map")) return false;

  const searchTerm = locationMatch ? locationMatch[1].trim() : message.replace(/find on map/i, "").trim();
  
  if (!searchTerm) {
    onSend("Please specify a location to search for. For example: 'Find places in New York'");
    return true;
  }
  
  try {
    onSend(`🔍 Searching for locations: ${searchTerm}...`);
    
    const { data, error } = await supabase.functions.invoke('get-location', {
      body: { 
        type: 'places',
        query: searchTerm
      }
    });

    if (error) throw error;
    
    if (data && data.places && data.places.length > 0) {
      const placesMessage = data.places.slice(0, 5).map((place: any) => {
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.placeId}`;
        return `- ${place.name}: ${place.address} [View on Map](${mapsUrl})`;
      }).join('\n');
      
      onSend(`📍 Found these locations:\n${placesMessage}`);
    } else {
      onSend(`No locations found for "${searchTerm}". Please try a different search term.`);
    }
  } catch (error) {
    console.error('Location search error:', error);
    toast({
      title: "Error",
      description: "Failed to search for locations. Please try again.",
      variant: "destructive",
    });
  }
  
  return true;
};
