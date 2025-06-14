
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
    selectedLanguage: string | null = null // This parameter is kept for potential future use by handlers
  ): Promise<boolean> => {
    // Check if it's a search query
    const searchMatch = message.match(/^\/search\s+(.+)/i);
    if (searchMatch) {
      // Attempt to handle web search. handleWebSearch will call onSend with results.
      // It returns true if it successfully handled and sent a message.
      if (await handleWebSearch(message, onSend)) {
        return true; // Indicate message was handled by web search
      }
      // If handleWebSearch returns false (e.g., invalid /search command format handled internally),
      // we might still consider it "handled" in the sense that it shouldn't go to general AI.
      // However, typical flow is handleWebSearch sends its own error message via onSend.
      // For simplicity, if handleWebSearch itself managed the response (even an error message to user), it's "handled".
    }

    // Try other handlers in order. Each handler should call onSend if it processes the message.
    if (handleNavigation(message, onSend)) return true;
    if (await handleWeather(message, onSend)) return true;
    if (await handleDistance(message, onSend)) return true;
    if (await handleLocation(message, onSend)) return true;
    if (await handleImageGeneration(message, imageUrls, onSend)) return true;

    // If no special processing was done by any handler, return false.
    // ChatLogic will then proceed to send the original message to the main AI.
    return false; 
  };

  return { processMessage };
};

