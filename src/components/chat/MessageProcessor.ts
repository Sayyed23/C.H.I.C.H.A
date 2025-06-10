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
    // Check if it's a search query - if so, modify the display message
    const searchMatch = message.match(/^\/search\s+(.+)/i);
    if (searchMatch) {
      const searchQuery = searchMatch[1].trim();
      // Override the user message to show just the search query without the /search command
      const displayMessage = `Search: ${searchQuery}`;
      
      // Process the search but let the handler send AI responses
      await handleWebSearch(message, onSend);
      
      // Return the clean display message for the user side
      return { processedMessage: displayMessage, wasProcessed: true };
    }

    // Try other handlers in order
    if (handleNavigation(message, onSend)) return { processedMessage: message, wasProcessed: true };
    if (await handleWeather(message, onSend)) return { processedMessage: message, wasProcessed: true };
    if (await handleDistance(message, onSend)) return { processedMessage: message, wasProcessed: true };
    if (await handleLocation(message, onSend)) return { processedMessage: message, wasProcessed: true };
    if (await handleImageGeneration(message, imageUrls, onSend)) return { processedMessage: message, wasProcessed: true };

    // If no special processing was done, combine message and image URLs into a single message string
    const fullMessage = [
      message,
      ...imageUrls.map(url => `![Image](${url})`)
    ].filter(Boolean).join('\n');

    // Pass selected language if available
    onSend(fullMessage, { targetLanguage: selectedLanguage || undefined });
    return { processedMessage: fullMessage, wasProcessed: true };
  };

  return { processMessage };
};
