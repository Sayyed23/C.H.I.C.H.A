
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export const handleWeather = async (
  message: string,
  onSend: (message: string, options?: { targetLanguage?: string }) => void
): Promise<boolean> => {
  const weatherMatch = message.match(/(?:what'?s|what\s+is|how\s+is|get|show|display|fetch)\s+(?:the\s+)?weather\s+(?:in|at|for|of)\s+([^?.,]+)/i);
  if (!weatherMatch) return false;

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
    toast({
      title: "Weather Error",
      description: "Failed to fetch weather information. Please try again.",
      variant: "destructive",
    });
  }
  
  return true;
};
