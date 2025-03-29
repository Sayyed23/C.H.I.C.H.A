
import { supabase } from "@/integrations/supabase/client";
import { type useToast } from "@/hooks/use-toast";

export interface MessageProcessorOptions {
  onSend: (message: string, options?: { targetLanguage?: string }) => void;
  toast: ReturnType<typeof useToast>;
}

export const MessageProcessor = (options: MessageProcessorOptions) => {
  const { onSend, toast } = options;

  const processMessage = async (
    message: string, 
    imageUrls: string[] = [], 
    selectedLanguage: string | null = null
  ) => {
    // Check if the message is a navigation request
    const navigationMatch = message.match(/From:\s*([^To]+)\s*To:\s*(.+)/i);
    if (navigationMatch) {
      const [, from, to] = navigationMatch;
      const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(from.trim())}&destination=${encodeURIComponent(to.trim())}`;
      onSend(`🗺️ Here's your route: [Open in Google Maps](${googleMapsUrl})`);
      return true;
    }

    // Check if the message is asking about weather
    const weatherMatch = message.match(/(?:what'?s|what\s+is|how\s+is|get|show|display|fetch)\s+(?:the\s+)?weather\s+(?:in|at|for|of)\s+([^?.,]+)/i);
    if (weatherMatch) {
      try {
        const location = weatherMatch[1].trim();
        
        if (!location) {
          onSend("I couldn't determine the location. Please specify a location, for example: 'What's the weather in London?'");
          return true;
        }

        onSend(`🌤️ Checking weather for ${location}...`);
        
        const { data, error } = await supabase.functions.invoke('get-weather', {
          body: { location },
        });

        if (error) throw error;

        if (data.message) {
          onSend(data.message);
        } else {
          onSend(`Sorry, I couldn't fetch weather information for ${location}.`);
        }
      } catch (error) {
        console.error('Weather fetch error:', error);
        toast.toast({
          title: "Weather Error",
          description: "Failed to fetch weather information. Please try again.",
          variant: "destructive",
        });
      }
      
      return true;
    }

    // Check for distance calculation request
    const distanceMatch = message.match(/Distance from:\s*([^to]+)\s*to:\s*(.+)/i);
    if (distanceMatch) {
      const [, origin, destination] = distanceMatch;
      
      try {
        onSend(`🗺️ Calculating distance from ${origin.trim()} to ${destination.trim()}...`);
        
        const { data, error } = await supabase.functions.invoke('get-location', {
          body: { 
            type: 'distance',
            query: {
              origin: origin.trim(),
              destination: destination.trim(),
              mode: 'driving'
            }
          }
        });

        if (error) throw error;
        
        if (data && data.distance) {
          const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin.trim())}&destination=${encodeURIComponent(destination.trim())}`;
          
          onSend(`📍 Distance from ${data.origin} to ${data.destination}:
- Distance: ${data.distance.text}
- Duration: ${data.duration.text} (by ${data.mode})

🔗 [View on Google Maps](${googleMapsUrl})`);
        } else {
          onSend("I couldn't calculate the distance between these locations. Please try again with more specific addresses.");
        }
      } catch (error) {
        console.error('Distance calculation error:', error);
        toast.toast({
          title: "Error",
          description: "Failed to calculate distance. Please try again.",
          variant: "destructive",
        });
      }
      
      return true;
    }

    // Check for location search request
    const locationMatch = message.match(/find (?:location|place)(?:s)? (?:of|for|in)?\s+(.+)/i);
    if (locationMatch || message.toLowerCase().includes("find on map")) {
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
        toast.toast({
          title: "Error",
          description: "Failed to search for locations. Please try again.",
          variant: "destructive",
        });
      }
      
      return true;
    }

    // If no special processing was done, combine message and image URLs into a single message string
    const fullMessage = [
      message,
      ...imageUrls.map(url => `![Image](${url})`)
    ].filter(Boolean).join('\n');

    // Pass selected language if available
    onSend(fullMessage, { targetLanguage: selectedLanguage || undefined });
    return true;
  };

  return { processMessage };
};