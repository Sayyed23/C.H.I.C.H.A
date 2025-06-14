
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
      // Return false to let the main AI handle the original message
      return false;
    }
    
    if (data?.error) {
      console.error('Search API returned error:', data.error);
      // Return false to let the main AI handle the original message
      return false;
    }
    
    // If we have results, format and send them
    if (data && data.results && data.results.length > 0) {
      const resultsMessage = data.results
        .map((result: any) => `### [${result.title}](${result.url})\n${result.domain}\n${result.snippet || ''}`)
        .join('\n\n');
      onSend(`## Search results from ${data.engine || 'google'}:\n\n${resultsMessage}`);
      return true;
    } else {
      // No results found, let main AI handle the query
      console.log('No search results found, passing to main AI');
      return false;
    }
  } catch (error) {
    console.error('Web search error:', error);
    
    toast({
      title: "Search Error",
      description: "Failed to perform web search. Processing with AI instead.",
      variant: "destructive",
    });
    
    // Return false to let the main AI handle the original message
    return false;
  }
};
