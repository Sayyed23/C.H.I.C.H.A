
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
    // Don't send the "Searching..." message, let the user message show just the query
    // and send results directly as AI response
    
    const { data, error } = await supabase.functions.invoke('web-search', {
      body: { query: searchQuery, engine: 'google' },
    });

    if (error) {
      throw new Error(`Search API error: ${error.message}`);
    }
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    if (data && data.results && data.results.length > 0) {
      const resultsMessage = data.results
        .slice(0, 5)
        .map((result: any) => `### [${result.title}](${result.url})\n${result.domain}\n${result.snippet || ''}`)
        .join('\n\n');
      onSend(`## Search results for "${searchQuery}":\n\n${resultsMessage}`);
    } else {
      onSend(`No search results found for "${searchQuery}". Please try a different search term.`);
    }
  } catch (error) {
    console.error('Web search error:', error);
    
    onSend(`⚠️ Search error: ${error instanceof Error ? error.message : 'Failed to search the web. Please try again later.'}`);
    
    toast({
      title: "Search Error",
      description: "Failed to perform web search. Please try again.",
      variant: "destructive",
    });
  }
  
  return true;
};
