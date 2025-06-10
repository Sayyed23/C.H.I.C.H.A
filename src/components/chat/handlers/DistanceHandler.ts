
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export const handleDistance = async (
  message: string,
  onSend: (message: string, options?: { targetLanguage?: string }) => void
): Promise<boolean> => {
  const distanceMatch = message.match(/Distance from:\s*([^to]+)\s*to:\s*(.+)/i);
  if (!distanceMatch) return false;

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
    toast({
      title: "Error",
      description: "Failed to calculate distance. Please try again.",
      variant: "destructive",
    });
  }
  
  return true;
};
