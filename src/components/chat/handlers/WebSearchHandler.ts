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
      throw new Error(`Search API error: ${error.message}`);
    }
    
    if (data?.error) {
      console.error('Search API returned error:', data.error);
      throw new Error(data.error);
    }
    
    if (data && data.results && Array.isArray(data.results) && data.results.length > 0) {
      console.log(`Found ${data.results.length} search results. Formatting for display.`);
      
      const titlesList = data.results
        .slice(0, 5) // Limiting to 5 results for display
        .map((result: any, index: number) => {
          const title = result.title || 'Untitled';
          return `${index + 1}. ${title}`; // Only display the title/question
        })
        .join('\n'); // Join with a simple newline
      
      const formattedMessage = `## 🔍 Search Results for "${searchQuery}"\n\n${titlesList}`;
      onSend(formattedMessage);
    } else {
      console.log('No search results found for query:', searchQuery);
      onSend(`## 🔍 Search Results for "${searchQuery}"\n\nNo search results found. This could be due to:\n- The search term being too specific\n- Temporary issues with the search service\n- Network connectivity problems\n\nPlease try:\n- Using different or more general search terms\n- Checking your internet connection\n- Trying again in a few moments`);
    }
  } catch (error) {
    console.error('Web search error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    onSend(`## ⚠️ Search Error\n\nI encountered an issue while searching for "${searchQuery}":\n\n**Error:** ${errorMessage}\n\nPlease try:\n- Checking your internet connection\n- Using different search terms\n- Trying again in a few moments\n\nIf the problem persists, the search service might be temporarily unavailable.`);
    
    toast({
      title: "Search Error",
      description: "Failed to perform web search. Please try again.",
      variant: "destructive",
    });
  }
  
  return true;
};
