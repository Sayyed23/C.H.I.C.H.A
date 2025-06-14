
import { handleWebSearch } from "./handlers/WebSearchHandler";
import { handleNavigation } from "./handlers/NavigationHandler";
import { handleWeather } from "./handlers/WeatherHandler";
import { handleDistance } from "./handlers/DistanceHandler";
import { handleLocation } from "./handlers/LocationHandler";
import { handleImageGeneration } from "./handlers/ImageHandler";

export interface MessageProcessorOptions {
  onSend: (message: string, options?: { targetLanguage?: string }) => void;
}

export const MessageProcessor = (options: MessageProcessorOptions) => {
  const { onSend } = options;

  const processMessage = async (
    message: string, 
    imageUrls: string[] = [], 
    selectedLanguage: string | null = null
  ) => {
    // Check if it's a search query
    const searchMatch = message.match(/^\/search\s+(.+)/i);
    if (searchMatch) {
      const searchQuery = searchMatch[1].trim();
      
      // Process the search - this will send AI responses
      const wasHandled = await handleWebSearch(message, onSend);
      
      if (wasHandled) {
        // Return false to indicate this was processed as a special command
        // The calling code should not send this message as a regular user message
        return false;
      }
    }

    // Try other handlers in order
    if (handleNavigation(message, onSend)) return false;
    if (await handleWeather(message, onSend)) return false;
    if (await handleDistance(message, onSend)) return false;
    if (await handleLocation(message, onSend)) return false;
    if (await handleImageGeneration(message, imageUrls, onSend)) return false;

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
