
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
    
    // If we have results, format and display them
    if (data && data.results && Array.isArray(data.results) && data.results.length > 0) {
      console.log(`Found ${data.results.length} search results. Formatting for display.`);
      
      const titlesList = data.results
        .slice(0, 5)
        .map((result: any, index: number) => {
          const title = result.title || 'Untitled';
          return `${index + 1}. ${title}`;
        })
        .join('\n');
      
      onSend(titlesList);
    } else {
      // Only return the query if no results were found
      console.log('No search results found for query:', searchQuery);
      onSend(searchQuery);
    }
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
