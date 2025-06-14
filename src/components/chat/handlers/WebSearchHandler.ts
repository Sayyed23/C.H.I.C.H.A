
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export const handleWebSearch = async (
  message: string,
  onSend: (message: string, options?: { targetLanguage?: string }) => void
): Promise<boolean> => {
  const searchMatch = message.match(/^\/search\s+(.+)/i);
  if (!searchMatch) return false;

  const searchQuery = searchMatch[1].trim();
  
  if (!searchQuery) {
    onSend("Please provide a search query. For example: '/search latest AI news'");
    return true;
  }
  
  try {
    console.log(`Starting web search for: "${searchQuery}"`);
    
    const { data, error } = await supabase.functions.invoke('web-search', {
      body: { query: searchQuery, engine: 'google' },
    });

    console.log('Web search response:', { data, error });

    if (error) {
      console.error('Supabase function error:', error);
      onSend(searchQuery);
      return true;
    }
    
    if (data?.error) {
      console.error('Search API returned error:', data.error);
      onSend(searchQuery);
      return true;
    }
    
    // Always return just the search query, regardless of results
    onSend(searchQuery);
  } catch (error) {
    console.error('Web search error:', error);
    onSend(searchQuery);
    
    toast({
      title: "Search Error",
      description: "Failed to perform web search. Please try again.",
      variant: "destructive",
    });
  }
  
  return true;
};
